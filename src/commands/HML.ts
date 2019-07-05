import chalk from "chalk";
import fs from "fs";
import _ from "lodash";
import ora from "ora";
import path from "path";
import { synchronized } from "./synchronized";

import { TinyPng } from "ttimg";
import { copyFile, createFolders, createWorkSpaceHash, forEachFile, md5, WorkSpaceHash , zipFiles} from "wlutil";

import imgsize from "image-size";
import sharp from "sharp";

interface FileInfo {
    high: number;
    mid: number;
    low: number;
    tiny: boolean;
}

interface HashInfo {
    md5: string;
    info: FileInfo;
}

interface ConfigInfo {
    srcFoldler: string; // 图片的原文件根目录
    dstFolder: string; // 生成结果存放的根目录
    cacheFolder: string; // 缓存根目录

    files: { [path: string]: FileInfo };

}
export class HML {

    public configFile: string;
    public resizedFolder: string;
    public tinyCacheFolder: string;
    public zipFolder: string;
    public keys: string[];
    public spanner: ora.Ora;
    public changedFinalFile: string[] = [];

    public configInfo: ConfigInfo;

    public hash: WorkSpaceHash;

    public tinypng: TinyPng;
    constructor(configFile: string,
                resizedFolder: string, tinyCacheFolder: string, zipFolder: string, keys: string[]) {
        this.configFile = configFile;
        this.resizedFolder = resizedFolder;
        this.tinyCacheFolder = tinyCacheFolder;
        this.zipFolder = zipFolder;
        this.keys = keys;

    }

    public loadConfigFile(configFile: string) {
        try {
            if (fs.existsSync(configFile)) {
                this.configInfo = JSON.parse(fs.readFileSync(configFile).toString());
                return;

            }
        } catch (e) {
            console.log(e);

            return;
        }
        this.configInfo = {
            srcFoldler: "",
            dstFolder: "",
            cacheFolder: "",

            files: {},
        };
        this.saveConfigFile(configFile);

    }

    public saveConfigFile(configFile: string) {
        fs.writeFileSync(configFile, JSON.stringify(this.configInfo, null, 2));
    }

    public validConfigInfo() {
        if (!this.configInfo.cacheFolder || !this.configInfo.dstFolder || !this.configInfo.srcFoldler) {
            return false;
        }
        return true;
    }

    public isSameInfo(obj1: HashInfo, obj2: HashInfo) {
        return obj1.md5 === obj2.md5
        && obj1.info.high === obj2.info.high
        && obj1.info.mid === obj2.info.mid
        && obj1.info.low === obj2.info.low
        && obj1.info.tiny === obj2.info.tiny;
    }

    public getChangedFile(): string[] {
        const changed: string[] = [];

        const srcPath = path.resolve(this.configInfo.srcFoldler);

        const files = forEachFile(srcPath);
        files.forEach(file => {
            const f = file.replace(srcPath + "/", "");
            const obj = this.hash.get(f) as HashInfo;
            const newHashInfo = {
                md5: md5(file),
                info: this.getConfigInfo(f),
            };
            if (!obj || !this.isSameInfo(obj, newHashInfo) ) {
                 changed.push(f);
             }
        });

        return changed;
    }

    public clampNum(v: number) {
        if (v < 1) {
            return 1;
        }
        return Math.floor(v);
    }

    public async  resize(src: string, dst: string, scale: number) {
        createFolders(dst, true);

        return new Promise<void>((resolve, reject) => {
            if (scale === 1) {
                copyFile(src, dst);
                resolve();
            } else {
                imgsize(src, (err, info) => {
                    if (err) {
                        console.log(err);
                        reject();
                        return;
                    }
                    sharp(src).resize(this.clampNum(info.width * scale),
                        this.clampNum(info.height * scale)).toFile(dst, (err2) => {
                            if (err2) {
                                console.log(err2);
                                reject();
                                return;
                            }
                            resolve();

                        });
                });

            }
        });

    }

    public getConfigInfo(f: string) {
        let info = this.configInfo.files[f];
        if (!info) {
            info = {
                high: 1,
                mid: 0.75,
                low: 0.5,
                tiny: true,
            };
            this.configInfo.files[f] = info;
        }
        return info;
    }

    public async  resizeImg(files: string[]) {
        const resizedFolder = path.resolve(this.configInfo.cacheFolder, this.resizedFolder);
        const srcFolder = path.resolve(this.configInfo.srcFoldler) + "/";
        const arr: Array<Promise<any>> = [];
        files.forEach(f => {
            const info = this.getConfigInfo(f);
            arr.push(this.resize(srcFolder + f, resizedFolder + "/high/" + f, info.high));
            arr.push(this.resize(srcFolder + f, resizedFolder + "/low/" + f, info.low));
            arr.push(this.resize(srcFolder + f, resizedFolder + "/mid/" + f, info.mid));

        });
        return Promise.all(arr);
    }

    @synchronized
    public async  process(src: string, relativeFile: string, tiny: boolean) {
        const arr = relativeFile.split("/");
        const dst = path.resolve(this.configInfo.dstFolder, arr.join("-"));
        this.changedFinalFile.push(dst);
        if (!tiny) {
            copyFile(src, dst);
            return;
        }
        const cacheFolder = path.resolve(this.configInfo.cacheFolder, this.tinyCacheFolder);
        if (!this.tinypng) {
            this.tinypng = new TinyPng(this.keys, cacheFolder);
        }
        this.spanner.succeed(chalk.green("开始tinypng处理文件" + src));
        await this.tinypng.processFile(src, dst);

    }

    public async  processToDst(files: string[]) {
        const resizedFolder = path.resolve(this.configInfo.cacheFolder, this.resizedFolder);
        const arr: Array<Promise<any>> = [];

        createFolders(path.resolve(this.configInfo.dstFolder));
        files.forEach(f => {
            const info = this.configInfo.files[f];
            if (!info) {
                this.spanner.fail("没有图片信息");
                return;
            }
            const newArr: Array<Promise<any>> = [];
            newArr.push(this.process(resizedFolder + "/high/" + f, "high/" + f, info.tiny));
            newArr.push(this.process(resizedFolder + "/low/" + f, "low/" + f, info.tiny));
            newArr.push(this.process(resizedFolder + "/mid/" + f, "mid/" + f, info.tiny));
            const p = Promise.all(newArr);
            p.then(() => {
                const newHashInfo = {
                    md5: md5(path.resolve(this.configInfo.srcFoldler, f)),
                    info: this.getConfigInfo(f),
                };
                this.hash.set(f, newHashInfo);
                this.hash.save();
            });
            arr.push(p);
        });
        return Promise.all(arr);
    }

    public getDateName() {
        const d = new Date();

        return [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()].join("-");
    }

    public async  zipChangedFinalFile() {
        return new Promise(resolve => {

            const changedZip = path.resolve(this.configInfo.cacheFolder, this.zipFolder, this.getDateName() + ".zip");
            createFolders(changedZip, true);
            zipFiles(this.changedFinalFile, changedZip, resolve);
        });

    }

    public async dofile() {

        const spanner = ora("处理配置文件");
        this.spanner = spanner;
        spanner.start();

        this.loadConfigFile(this.configFile);
        // 没有配置文件则自动生成一个
        if (!this.validConfigInfo()) {
            spanner.fail(chalk.green("请先填写配置文件" + this.configFile));
            spanner.succeed(chalk.green("srcFoldler图片放置的根目录"));
            spanner.succeed(chalk.green("dstFoldler图片处理的结果目录"));
            spanner.succeed(chalk.green("cacheFolder缓存根目录"));
            spanner.succeed(chalk.green("files文件配置，填写要处理的文件的配置情况"));
            spanner.succeed(chalk.green("files:{'image/111.png':{high:1,mid:0.75,low:0.5,tiny:true}}"));
            spanner.succeed(chalk.green("如果在遍历srcFolder时发现有文件不在files里，则会自动在files里生成一条这个文件的信息"));
            return;
        }

        this.hash = createWorkSpaceHash(this.configInfo.srcFoldler, this.configInfo.cacheFolder + "/");
        this.changedFinalFile = [];
        // 获得变化的文件
        const changed = this.getChangedFile();

        try {
            if (changed.length === 0) {
                spanner.succeed("没有文件变化");
            } else {
                spanner.succeed(chalk.green("开始缩放文件"));
                // 缩放变化的文件
                await this.resizeImg(changed);

                spanner.succeed(chalk.green("开始tinypng文件"));
                // 处理文件到dstFolder
                await this.processToDst(changed);

                spanner.succeed(chalk.green("打zip包"));
                await this.zipChangedFinalFile();

            }
            this.saveConfigFile(this.configFile);

            spanner.succeed("处理完成");
        } catch (e) {
            spanner.fail("失败");
        }
    }
}
