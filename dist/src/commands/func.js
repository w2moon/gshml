var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../logger");
const HML_1 = require("./HML");
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
exports.default = (args) => __awaiter(this, void 0, void 0, function* () {
    const c = new HML_1.HML(ConfigFile, CacheFile, ResizedFolder, TinyCacheFolder, ZipFolder, keys);
    c.dofile();
});
