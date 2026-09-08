import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { extractWechatQr } from "./image-processor";

const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export interface PrepareWechatCardsOptions {
  inputDir: string;
  outputDir: string;
}

export interface PreparedWechatCard {
  name: string;
  source: string;
  method: "detected" | "template";
}

export async function prepareWechatCards({
  inputDir,
  outputDir,
}: PrepareWechatCardsOptions): Promise<PreparedWechatCard[]> {
  const entries = (await readdir(inputDir, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase()),
    )
    .sort((left, right) => left.name.localeCompare(right.name));

  if (entries.length === 0) {
    throw new Error("未在输入目录中找到名片图片");
  }

  const results: PreparedWechatCard[] = [];
  for (const entry of entries) {
    const extension = extname(entry.name).toLowerCase();
    const name = basename(entry.name, extension);
    const sourcePath = join(inputDir, entry.name);
    const source = await readFile(sourcePath);
    const extracted = await extractWechatQr(source);
    const contactOutputDir = join(outputDir, name);

    await mkdir(contactOutputDir, { recursive: true });
    await copyFile(sourcePath, join(contactOutputDir, `wechat-card${extension}`));
    await writeFile(join(contactOutputDir, "wechat-qr.png"), extracted.qr);
    results.push({ name, source: entry.name, method: extracted.method });
  }

  return results;
}
