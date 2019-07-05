#!/usr/bin/env node
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const pkg = __importStar(require("../package.json"));
const func_1 = __importDefault(require("./commands/func"));
const logger_1 = require("./logger");
commander_1.default
    .version(pkg.version)
    .usage("<command> <配置文件>")
    .option("-v, --verbose", "显示详细执行过程");
commander_1.default.on("option:verbose", () => logger_1.configure("debug"));
commander_1.default.parse(process.argv);
func_1.default(commander_1.default.args);
