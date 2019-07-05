var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log4js_1 = __importDefault(require("log4js"));
function configure(level) {
    log4js_1.default.configure({
        appenders: { normal: { type: "Console" } },
        categories: {
            gsnml: { appenders: ["normal"], level },
            default: { appenders: ["normal"], level },
        }
    });
}
exports.configure = configure;
function getLogger(name) {
    return log4js_1.default.getLogger(name);
}
exports.getLogger = getLogger;
