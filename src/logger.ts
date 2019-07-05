import log4js from "log4js";

/**
 * 配置日志是否显示详细信息
 */
export function configure(level: string) {
  log4js.configure({
    appenders: { normal: { type: "Console" } },
    categories: {
      gsnml : { appenders: ["normal"], level },
      default: { appenders: ["normal"], level }, 
    }
  })
}
/**
 * 获得对应模块的logger
 */
export function getLogger(name: "gsnml") {
  return log4js.getLogger(name);
}
