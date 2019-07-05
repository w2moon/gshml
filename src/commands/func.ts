import {synchronized} from "@vadzim/synchronized";
import chalk from "chalk";
import fs from "fs";
import _ from "lodash";
import ora from "ora";
import path from "path";
import prompts from "prompts";
import copy from "recursive-copy";
import rimraf from "rimraf";
import through2 from "through2";
import { getLogger } from "../logger";

import {MD5Cache} from "md5cache";
import {MD5Storage} from "md5storage";
import {TinyPng} from "ttimg";
import {copyFile, createFolders, forEachFile, md5, zipFiles} from "wlutil";

import imgsize from "image-size";
import sharp from "sharp";

const logger = getLogger("gsnml");

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
let changedFinalFile: string[] = [];

let configInfo: ConfigInfo;
let md5cache: MD5Cache;

let tinypng: TinyPng;

interface FileInfo {
  high: number;
  mid: number;
  low: number;
  tiny: boolean;
}

interface ConfigInfo {
  srcFoldler: string; // 图片的原文件根目录
  dstFolder: string; // 生成结果存放的根目录
  cacheFolder: string; // 缓存根目录

  files: {[path: string]: FileInfo};

}

function loadConfigFile(configFile: string) {
  try {
    if (fs.existsSync(configFile)) {
      configInfo = JSON.parse(fs.readFileSync(configFile).toString());
      return;

    }
  } catch (e) {
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

function saveConfigFile(configFile: string) {
  fs.writeFileSync(configFile, JSON.stringify(configInfo, null, 2));
}

function validConfigInfo() {
  if (!configInfo.cacheFolder || !configInfo.dstFolder || !configInfo.srcFoldler) {
    return false;
  }
  return true;
}

function getChangedFile(): string[] {
  const changed: string[] = [];

  const srcPath = path.resolve(configInfo.srcFoldler);
  const cacheFile = path.resolve(configInfo.cacheFolder, CacheFile);
  if (!md5cache) {
    md5cache = new MD5Cache(cacheFile);
  }

  const files = forEachFile(srcPath);
  files.forEach(file => {
    const f = file.replace(srcPath + "/", "");
    if (md5cache.isNew(f, md5(file) )) {
      changed.push(f);
    }
  });

  return changed;
}

function clampNum(v: number) {
  if (v < 1) {
    return 1;
  }
  return Math.floor(v);
}

async function resize(src: string, dst: string, scale: number) {
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
        sharp(src).resize(clampNum(info.width * scale), clampNum(info.height * scale)).toFile(dst, (err2) => {
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

async function resizeImg(files: string[]) {
  const resizedFolder = path.resolve(configInfo.cacheFolder, ResizedFolder);
  const srcFolder = path.resolve(configInfo.srcFoldler) + "/";
  const arr: Array<Promise<any>> = [];
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
    arr.push(resize(srcFolder + f, resizedFolder + "/high/" + f , info.high));
    arr.push(resize(srcFolder + f, resizedFolder + "/low/" + f , info.low));
    arr.push(resize(srcFolder + f, resizedFolder + "/mid/" + f , info.mid));

  });
  return Promise.all(arr);
}

@synchronized
async function process(src: string, relativeFile: string , tiny: boolean) {
  const arr = relativeFile.split("/");
  const dst = path.resolve(configInfo.dstFolder, arr.join("-"));
  changedFinalFile.push(dst);
  if (!tiny) {
    copyFile(src, dst);
    return;
  }
  const cacheFolder = path.resolve(configInfo.cacheFolder, TinyCacheFolder);
  if (!tinypng) {
    tinypng = new TinyPng(keys, cacheFolder);
  }
  await tinypng.processFile(src, dst);

}

async function processToDst(files: string[]) {
  const resizedFolder = path.resolve(configInfo.cacheFolder, ResizedFolder);
  const arr: Array<Promise<any>> = [];

  createFolders(path.resolve(configInfo.dstFolder));
  files.forEach(f => {
    const info = configInfo.files[f];
    if (!info) {
      console.log("没有图片信息");
      return;
    }
    const newArr: Array<Promise<any>> = [];
    newArr.push(process(resizedFolder + "/high/" + f, "high/" + f, info.tiny));
    newArr.push(process(resizedFolder + "/low/" + f, "low/" + f, info.tiny));
    newArr.push(process(resizedFolder + "/mid/" + f, "mid/" + f, info.tiny));
    const p = Promise.all(newArr);
    p.then(() => {
      md5cache.record(f, md5(path.resolve(configInfo.srcFoldler, f)));
    });
    arr.push(p);
  });
  return Promise.all(arr);
}

function getDateName() {
  const d = new Date();

  return [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()].join("-");
}

async function zipChangedFinalFile() {
  return new Promise(resolve => {

    const changedZip = path.resolve(configInfo.cacheFolder, ZipFolder, getDateName() + ".zip");
    createFolders(changedZip, true);
    zipFiles(changedFinalFile, changedZip, resolve);
  });

}

export default async (args: string[]) => {
  // 配置文件
  const configFile = ConfigFile;
  const spanner = ora("处理配置文件");
  spanner.start();

  loadConfigFile(configFile);
  // 没有配置文件则自动生成一个
  if (!validConfigInfo()) {
    spanner.fail(chalk.green("请先填写配置文件" + configFile));
    spanner.succeed(chalk.green("srcFoldler图片放置的根目录"));
    spanner.succeed(chalk.green("dstFoldler图片处理的结果目录"));
    spanner.succeed(chalk.green("cacheFolder缓存根目录"));
    spanner.succeed(chalk.green("files文件配置，填写要处理的文件的配置情况"));
    spanner.succeed(chalk.green("files:{'image/111.png':{high:1,mid:0.75,low:0.5,tiny:true}}"));
    spanner.succeed(chalk.green("如果在遍历srcFolder时发现有文件不在files里，则会自动在files里生成一条这个文件的信息"));
    return;
  }
  changedFinalFile = [];
  // 获得变化的文件
  const changed = getChangedFile();

  try {
 // 缩放变化的文件
 await resizeImg(changed);

 // 处理文件到dstFolder
 await processToDst(changed);

 await zipChangedFinalFile();

 changedFinalFile.forEach(f => {
   spanner.succeed(f);
 });

 spanner.succeed("处理完成");
  } catch (e) {
    spanner.fail("失败");
  }

};
