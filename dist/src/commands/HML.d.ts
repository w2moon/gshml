import ora from "ora";
import { MD5Cache } from "md5cache";
import { TinyPng } from "ttimg";
interface FileInfo {
    high: number;
    mid: number;
    low: number;
    tiny: boolean;
}
interface ConfigInfo {
    srcFoldler: string;
    dstFolder: string;
    cacheFolder: string;
    files: {
        [path: string]: FileInfo;
    };
}
export declare class HML {
    configFile: string;
    cacheFile: string;
    resizedFolder: string;
    tinyCacheFolder: string;
    zipFolder: string;
    keys: string[];
    changedFinalFile: string[];
    configInfo: ConfigInfo;
    md5cache: MD5Cache;
    tinypng: TinyPng;
    constructor(configFile: string, cacheFile: string, resizedFolder: string, tinyCacheFolder: string, zipFolder: string, keys: string[]);
    loadConfigFile(configFile: string): void;
    saveConfigFile(configFile: string): void;
    validConfigInfo(): boolean;
    getChangedFile(): string[];
    clampNum(v: number): number;
    resize(src: string, dst: string, scale: number): Promise<void>;
    resizeImg(files: string[]): Promise<any[]>;
    process(src: string, relativeFile: string, tiny: boolean): Promise<void>;
    spanner: ora.Ora;
    processToDst(files: string[]): Promise<any[]>;
    getDateName(): string;
    zipChangedFinalFile(): Promise<{}>;
    dofile(): Promise<void>;
}
export {};
