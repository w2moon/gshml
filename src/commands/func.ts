
import _ from "lodash";
import { getLogger } from "../logger";

import { HML } from "./HML";

const logger = getLogger("gsnml");

const ConfigFile = ".hml";
const ResizedFolder = "resized";
const TinyCacheFolder = "tiny";
const ZipFolder = "zip";
const keys = [
  "Ax7hsXHJj2TYy2mN82rVozNUSfMcuEJX",
  "76D9LDLthfBGZbn92NDrFQ885f4Rsh9k",
  "sNB0d4nRvh0Vs0yY5MP79njJjZrMyLvq",
  "nqb0kKydv960Gbrr1X0CTC5fWGsZXzSz"
];

export default async (args: string[]) => {
  // 配置文件
  const c = new HML(ConfigFile,  ResizedFolder, TinyCacheFolder, ZipFolder, keys);
  c.dofile();

};
