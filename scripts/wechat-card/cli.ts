import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { prepareWechatCards } from "./prepare-batch";

export function getDefaultWechatCardDirectories(cwd: string) {
  const baseDir = join(cwd, "docs", "_local", "wechat-cards");
  return {
    inputDir: join(baseDir, "input"),
    outputDir: join(baseDir, "output"),
  };
}

export async function runWechatCardCli(cwd = process.cwd()) {
  const results = await prepareWechatCards(getDefaultWechatCardDirectories(cwd));
  for (const result of results) {
    const method = result.method === "detected" ? "自动识别" : "模板兜底";
    console.log(`已处理 ${result.source}：${method}，输出到 ${result.name}/`);
  }
}

const entryPoint = process.argv[1];
if (entryPoint && fileURLToPath(import.meta.url) === resolve(entryPoint)) {
  runWechatCardCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
