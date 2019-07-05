var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const ora_1 = __importDefault(require("ora"));
const path_1 = __importDefault(require("path"));
const synchronized_1 = require("./synchronized");
const ttimg_1 = require("ttimg");
const wlutil_1 = require("wlutil");
const image_size_1 = __importDefault(require("image-size"));
const sharp_1 = __importDefault(require("sharp"));
class HML {
    constructor(configFile, resizedFolder, tinyCacheFolder, zipFolder, keys) {
        this.changedFinalFile = [];
        this.configFile = configFile;
        this.resizedFolder = resizedFolder;
        this.tinyCacheFolder = tinyCacheFolder;
        this.zipFolder = zipFolder;
        this.keys = keys;
    }
    loadConfigFile(configFile) {
        try {
            if (fs_1.default.existsSync(configFile)) {
                this.configInfo = JSON.parse(fs_1.default.readFileSync(configFile).toString());
                return;
            }
        }
        catch (e) {
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
    saveConfigFile(configFile) {
        fs_1.default.writeFileSync(configFile, JSON.stringify(this.configInfo, null, 2));
    }
    validConfigInfo() {
        if (!this.configInfo.cacheFolder || !this.configInfo.dstFolder || !this.configInfo.srcFoldler) {
            return false;
        }
        return true;
    }
    isSameInfo(obj1, obj2) {
        return obj1.md5 === obj2.md5
            && obj1.info.high === obj2.info.high
            && obj1.info.mid === obj2.info.mid
            && obj1.info.low === obj2.info.low
            && obj1.info.tiny === obj2.info.tiny;
    }
    getChangedFile() {
        const changed = [];
        const srcPath = path_1.default.resolve(this.configInfo.srcFoldler);
        const files = wlutil_1.forEachFile(srcPath);
        files.forEach(file => {
            const f = file.replace(srcPath + "/", "");
            const obj = this.hash.get(f);
            const newHashInfo = {
                md5: wlutil_1.md5(file),
                info: this.getConfigInfo(f),
            };
            if (!obj || !this.isSameInfo(obj, newHashInfo)) {
                changed.push(f);
            }
        });
        return changed;
    }
    clampNum(v) {
        if (v < 1) {
            return 1;
        }
        return Math.floor(v);
    }
    resize(src, dst, scale) {
        return __awaiter(this, void 0, void 0, function* () {
            wlutil_1.createFolders(dst, true);
            return new Promise((resolve, reject) => {
                if (scale === 1) {
                    wlutil_1.copyFile(src, dst);
                    resolve();
                }
                else {
                    image_size_1.default(src, (err, info) => {
                        if (err) {
                            console.log(err);
                            reject();
                            return;
                        }
                        sharp_1.default(src).resize(this.clampNum(info.width * scale), this.clampNum(info.height * scale)).toFile(dst, (err2) => {
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
        });
    }
    getConfigInfo(f) {
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
    resizeImg(files) {
        return __awaiter(this, void 0, void 0, function* () {
            const resizedFolder = path_1.default.resolve(this.configInfo.cacheFolder, this.resizedFolder);
            const srcFolder = path_1.default.resolve(this.configInfo.srcFoldler) + "/";
            const arr = [];
            files.forEach(f => {
                const info = this.getConfigInfo(f);
                arr.push(this.resize(srcFolder + f, resizedFolder + "/high/" + f, info.high));
                arr.push(this.resize(srcFolder + f, resizedFolder + "/low/" + f, info.low));
                arr.push(this.resize(srcFolder + f, resizedFolder + "/mid/" + f, info.mid));
            });
            return Promise.all(arr);
        });
    }
    process(src, relativeFile, tiny) {
        return __awaiter(this, void 0, void 0, function* () {
            const arr = relativeFile.split("/");
            const dst = path_1.default.resolve(this.configInfo.dstFolder, arr.join("-"));
            this.changedFinalFile.push(dst);
            if (!tiny) {
                wlutil_1.copyFile(src, dst);
                return;
            }
            const cacheFolder = path_1.default.resolve(this.configInfo.cacheFolder, this.tinyCacheFolder);
            if (!this.tinypng) {
                this.tinypng = new ttimg_1.TinyPng(this.keys, cacheFolder);
            }
            this.spanner.succeed(chalk_1.default.green("开始tinypng处理文件" + src));
            yield this.tinypng.processFile(src, dst);
        });
    }
    processToDst(files) {
        return __awaiter(this, void 0, void 0, function* () {
            const resizedFolder = path_1.default.resolve(this.configInfo.cacheFolder, this.resizedFolder);
            const arr = [];
            wlutil_1.createFolders(path_1.default.resolve(this.configInfo.dstFolder));
            files.forEach(f => {
                const info = this.configInfo.files[f];
                if (!info) {
                    this.spanner.fail("没有图片信息");
                    return;
                }
                const newArr = [];
                newArr.push(this.process(resizedFolder + "/high/" + f, "high/" + f, info.tiny));
                newArr.push(this.process(resizedFolder + "/low/" + f, "low/" + f, info.tiny));
                newArr.push(this.process(resizedFolder + "/mid/" + f, "mid/" + f, info.tiny));
                const p = Promise.all(newArr);
                p.then(() => {
                    const newHashInfo = {
                        md5: wlutil_1.md5(path_1.default.resolve(this.configInfo.srcFoldler, f)),
                        info: this.getConfigInfo(f),
                    };
                    this.hash.set(f, newHashInfo);
                    this.hash.save();
                });
                arr.push(p);
            });
            return Promise.all(arr);
        });
    }
    getDateName() {
        const d = new Date();
        return [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()].join("-");
    }
    zipChangedFinalFile() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                const changedZip = path_1.default.resolve(this.configInfo.cacheFolder, this.zipFolder, this.getDateName() + ".zip");
                wlutil_1.createFolders(changedZip, true);
                wlutil_1.zipFiles(this.changedFinalFile, changedZip, resolve);
            });
        });
    }
    dofile() {
        return __awaiter(this, void 0, void 0, function* () {
            const spanner = ora_1.default("处理配置文件");
            this.spanner = spanner;
            spanner.start();
            this.loadConfigFile(this.configFile);
            if (!this.validConfigInfo()) {
                spanner.fail(chalk_1.default.green("请先填写配置文件" + this.configFile));
                spanner.succeed(chalk_1.default.green("srcFoldler图片放置的根目录"));
                spanner.succeed(chalk_1.default.green("dstFoldler图片处理的结果目录"));
                spanner.succeed(chalk_1.default.green("cacheFolder缓存根目录"));
                spanner.succeed(chalk_1.default.green("files文件配置，填写要处理的文件的配置情况"));
                spanner.succeed(chalk_1.default.green("files:{'image/111.png':{high:1,mid:0.75,low:0.5,tiny:true}}"));
                spanner.succeed(chalk_1.default.green("如果在遍历srcFolder时发现有文件不在files里，则会自动在files里生成一条这个文件的信息"));
                return;
            }
            this.hash = wlutil_1.createWorkSpaceHash(this.configInfo.srcFoldler, this.configInfo.cacheFolder + "/");
            this.changedFinalFile = [];
            const changed = this.getChangedFile();
            try {
                if (changed.length === 0) {
                    spanner.succeed("没有文件变化");
                }
                else {
                    spanner.succeed(chalk_1.default.green("开始缩放文件"));
                    yield this.resizeImg(changed);
                    spanner.succeed(chalk_1.default.green("开始tinypng文件"));
                    yield this.processToDst(changed);
                    spanner.succeed(chalk_1.default.green("打zip包"));
                    yield this.zipChangedFinalFile();
                }
                this.saveConfigFile(this.configFile);
                spanner.succeed("处理完成");
            }
            catch (e) {
                spanner.fail("失败");
            }
        });
    }
}
__decorate([
    synchronized_1.synchronized
], HML.prototype, "process", null);
exports.HML = HML;
