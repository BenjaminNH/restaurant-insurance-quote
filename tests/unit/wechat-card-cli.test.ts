import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { getDefaultWechatCardDirectories } from "../../scripts/wechat-card/cli";

describe("getDefaultWechatCardDirectories", () => {
  test("keeps private inputs and outputs under the ignored local docs directory", () => {
    expect(getDefaultWechatCardDirectories("D:\\workspace")).toEqual({
      inputDir: join("D:\\workspace", "docs", "_local", "wechat-cards", "input"),
      outputDir: join("D:\\workspace", "docs", "_local", "wechat-cards", "output"),
    });
  });
});
