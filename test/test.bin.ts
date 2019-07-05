import { expect } from "chai";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const node = path.join(__dirname, "../node_modules/ts-node/dist/bin.js");
const bin = path.join(__dirname, "../src/bin.ts");
describe("测试", () => {
  it("测试版本号应该和package.json中相同", done => {
    exec(`${node} ${bin} -V`, (error, stdout, stderr) => {
      expect(error).equal(null);
      expect(stdout).equal(
        JSON.parse(
          fs.readFileSync(path.join(__dirname, "../package.json")).toString()
        ).version + "\n"
      );
      done();
    });
  });
});
