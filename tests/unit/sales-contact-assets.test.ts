import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import jsQR from "jsqr";
import sharp from "sharp";
import { expect, test } from "vitest";
import { extractWechatQr } from "../../scripts/wechat-card/image-processor";

const contactDirectory = join(process.cwd(), "public", "sales-contacts", "ou-zhijun");
const qrImagePath = join(contactDirectory, "wechat-qr.png");
const cardImagePath = join(contactDirectory, "wechat-card.jpg");

async function decodeQr(image: string | Buffer) {
  const source = typeof image === "string" ? await readFile(image) : image;
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return jsQR(new Uint8ClampedArray(data), info.width, info.height, {
    inversionAttempts: "dontInvert",
  });
}

test("公开联系人资产存在且生产配置不引用本地临时路径", async () => {
  await expect(access(qrImagePath)).resolves.toBeUndefined();
  await expect(access(cardImagePath)).resolves.toBeUndefined();

  for (const imagePath of [qrImagePath, cardImagePath]) {
    expect(imagePath).not.toContain("docs/_local");
    expect(imagePath).not.toContain("xwechat_files");
  }

  const productionConfig = await readFile(join(process.cwd(), "src", "config", "site.ts"), "utf8");
  expect(productionConfig).not.toContain("docs/_local");
  expect(productionConfig).not.toContain("xwechat_files");
});

test("完整微信名片保持竖版比例", async () => {
  const metadata = await sharp(await readFile(cardImagePath)).metadata();

  expect(metadata.width).toBeGreaterThan(0);
  expect(metadata.height).toBeGreaterThan(metadata.width!);
});

test("公开二维码可解码且与完整微信名片中的二维码内容一致", async () => {
  const [qr, card] = await Promise.all([
    decodeQr(qrImagePath),
    extractWechatQr(await readFile(cardImagePath)),
  ]);

  expect(qr).not.toBeNull();
  expect(card).not.toBeNull();
  expect(qr?.data).toBe(card?.qr ? (await decodeQr(card.qr))?.data : undefined);
});
