#!/usr/bin/env node
import program from "commander";
import * as pkg from "../package.json";
import func from "./commands/func";
import { configure } from "./logger";
program
  .version(pkg.version)
  .usage("<command> <配置文件>")
  .option("-v, --verbose", "显示详细执行过程");

program.on("option:verbose", () => configure("debug"));

program.parse(process.argv);
func(program.args);
