import ora from "ora";
import { TinyPng } from "ttimg";
import { WorkSpaceHash } from "wlutil";
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
    srcFoldler: string;
    dstFolder: string;
    cacheFolder: string;
    files: {
        [path: string]: FileInfo;
    };
}
export declare class HML {
    configFile: string;
    resizedFolder: string;
    tinyCacheFolder: string;
    zipFolder: string;
    keys: string[];
    spanner: ora.Ora;
    changedFinalFile: string[];
    changedInfo: {
        [key: string]: number;
    };
    configInfo: ConfigInfo;
    hash: WorkSpaceHash;
    tinypng: TinyPng;
    constructor(configFile: string, resizedFolder: string, tinyCacheFolder: string, zipFolder: string, keys: string[]);
    loadConfigFile(configFile: string): void;
    saveConfigFile(configFile: string): void;
    validConfigInfo(): boolean;
    isSameInfo(obj1: HashInfo, obj2: HashInfo): boolean;
    getChangedFile(): string[];
    clampNum(v: number): number;
    resize(src: string, dst: string, scale: number): Promise<void>;
    getConfigInfo(f: string): FileInfo;
    resizeImg(files: string[]): Promise<any[]>;
    process(src: string, relativeFile: string, tiny: boolean): Promise<void>;
    processToDst(files: string[]): Promise<any[]>;
    getDateName(): string;
    zipChangedFinalFile(): Promise<unknown>;
    dofile(): Promise<void>;
}
export {};
