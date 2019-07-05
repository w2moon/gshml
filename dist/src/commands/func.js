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
const logger_1 = require("../logger");
const md5cache_1 = require("md5cache");
const ttimg_1 = require("ttimg");
const wlutil_1 = require("wlutil");
const image_size_1 = __importDefault(require("image-size"));
const sharp_1 = __importDefault(require("sharp"));
const logger = logger_1.getLogger("gsnml");
const ConfigFile = ".hml";
const CacheFile = "cache.json";
const ResizedFolder = "resized";
const TinyCacheFolder = "tiny";
const ZipFolder = "zip";
const keys = [
    "Ax7hsXHJj2TYy2mN82rVozNUSfMcuEJX",
    "76D9LDLthfBGZbn92NDrFQ885f4Rsh9k",
    "sNB0d4nRvh0Vs0yY5MP79njJjZrMyLvq",
    "nqb0kKydv960Gbrr1X0CTC5fWGsZXzSz"
];
let changedFinalFile = [];
let configInfo;
let md5cache;
let tinypng;
function loadConfigFile(configFile) {
    try {
        if (fs_1.default.existsSync(configFile)) {
            configInfo = JSON.parse(fs_1.default.readFileSync(configFile).toString());
            return;
        }
    }
    catch (e) {
        console.log(e);
        return;
    }
    configInfo = {
        srcFoldler: "",
        dstFolder: "",
        cacheFolder: "",
        files: {},
    };
    saveConfigFile(configFile);
}
function saveConfigFile(configFile) {
    fs_1.default.writeFileSync(configFile, JSON.stringify(configInfo, null, 2));
}
function validConfigInfo() {
    if (!configInfo.cacheFolder || !configInfo.dstFolder || !configInfo.srcFoldler) {
        return false;
    }
    return true;
}
function getChangedFile() {
    const changed = [];
    const srcPath = path_1.default.resolve(configInfo.srcFoldler);
    const cacheFile = path_1.default.resolve(configInfo.cacheFolder, CacheFile);
    if (!md5cache) {
        md5cache = new md5cache_1.MD5Cache(cacheFile);
    }
    const files = wlutil_1.forEachFile(srcPath);
    files.forEach(file => {
        const f = file.replace(srcPath + "/", "");
        if (md5cache.isNew(f, wlutil_1.md5(file))) {
            changed.push(f);
        }
    });
    return changed;
}
function clampNum(v) {
    if (v < 1) {
        return 1;
    }
    return Math.floor(v);
}
function resize(src, dst, scale) {
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
                    sharp_1.default(src).resize(clampNum(info.width * scale), clampNum(info.height * scale)).toFile(dst, (err2) => {
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
function resizeImg(files) {
    return __awaiter(this, void 0, void 0, function* () {
        const resizedFolder = path_1.default.resolve(configInfo.cacheFolder, ResizedFolder);
        const srcFolder = path_1.default.resolve(configInfo.srcFoldler) + "/";
        const arr = [];
        files.forEach(f => {
            let info = configInfo.files[f];
            if (!info) {
                info = {
                    high: 1,
                    mid: 0.75,
                    low: 0.5,
                    tiny: true,
                };
                configInfo.files[f] = info;
            }
            arr.push(resize(srcFolder + f, resizedFolder + "/high/" + f, info.high));
            arr.push(resize(srcFolder + f, resizedFolder + "/low/" + f, info.low));
            arr.push(resize(srcFolder + f, resizedFolder + "/mid/" + f, info.mid));
        });
        return Promise.all(arr);
    });
}
function process(src, relativeFile, tiny) {
    return __awaiter(this, void 0, void 0, function* () {
        const arr = relativeFile.split("/");
        const dst = path_1.default.resolve(configInfo.dstFolder, arr.join("-"));
        changedFinalFile.push(dst);
        if (!tiny) {
            wlutil_1.copyFile(src, dst);
            return;
        }
        const cacheFolder = path_1.default.resolve(configInfo.cacheFolder, TinyCacheFolder);
        if (!tinypng) {
            tinypng = new ttimg_1.TinyPng(keys, cacheFolder);
        }
        yield tinypng.processFile(src, dst);
    });
}
function processToDst(files) {
    return __awaiter(this, void 0, void 0, function* () {
        const resizedFolder = path_1.default.resolve(configInfo.cacheFolder, ResizedFolder);
        const arr = [];
        wlutil_1.createFolders(path_1.default.resolve(configInfo.dstFolder));
        files.forEach(f => {
            const info = configInfo.files[f];
            if (!info) {
                console.log("没有图片信息");
                return;
            }
            const newArr = [];
            newArr.push(process(resizedFolder + "/high/" + f, "high/" + f, info.tiny));
            newArr.push(process(resizedFolder + "/low/" + f, "low/" + f, info.tiny));
            newArr.push(process(resizedFolder + "/mid/" + f, "mid/" + f, info.tiny));
            const p = Promise.all(newArr);
            p.then(() => {
                md5cache.record(f, wlutil_1.md5(path_1.default.resolve(configInfo.srcFoldler, f)));
            });
            arr.push(p);
        });
        return Promise.all(arr);
    });
}
function getDateName() {
    const d = new Date();
    return [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()].join("-");
}
function zipChangedFinalFile() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => {
            const changedZip = path_1.default.resolve(configInfo.cacheFolder, ZipFolder, getDateName() + ".zip");
            wlutil_1.createFolders(changedZip, true);
            wlutil_1.zipFiles(changedFinalFile, changedZip, resolve);
        });
    });
}
exports.default = (args) => __awaiter(this, void 0, void 0, function* () {
    const configFile = ConfigFile;
    const spanner = ora_1.default("处理配置文件");
    spanner.start();
    loadConfigFile(configFile);
    if (!validConfigInfo()) {
        spanner.fail(chalk_1.default.green("请先填写配置文件" + configFile));
        spanner.succeed(chalk_1.default.green("srcFoldler图片放置的根目录"));
        spanner.succeed(chalk_1.default.green("dstFoldler图片处理的结果目录"));
        spanner.succeed(chalk_1.default.green("cacheFolder缓存根目录"));
        spanner.succeed(chalk_1.default.green("files文件配置，填写要处理的文件的配置情况"));
        spanner.succeed(chalk_1.default.green("files:{'image/111.png':{high:1,mid:0.75,low:0.5,tiny:true}}"));
        spanner.succeed(chalk_1.default.green("如果在遍历srcFolder时发现有文件不在files里，则会自动在files里生成一条这个文件的信息"));
        return;
    }
    changedFinalFile = [];
    const changed = getChangedFile();
    try {
        yield resizeImg(changed);
        yield processToDst(changed);
        yield zipChangedFinalFile();
        changedFinalFile.forEach(f => {
            spanner.succeed(f);
        });
        spanner.succeed("处理完成");
    }
    catch (e) {
        spanner.fail("失败");
    }
});
