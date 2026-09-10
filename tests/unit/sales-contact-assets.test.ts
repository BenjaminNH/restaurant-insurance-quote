import { access, readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import jsQR from "jsqr";
import sharp from "sharp";
import { expect, test } from "vitest";
import { salesContacts } from "@/config/sales-contacts";
import { extractWechatQr } from "../../scripts/wechat-card/image-processor";

const contactDirectory = join(process.cwd(), "public", "sales-contacts", "ou-zhijun");
const qrImagePath = join(contactDirectory, "wechat-qr.png");
const cardImagePath = join(contactDirectory, "wechat-card.jpg");
const demoDirectory = join(process.cwd(), "public", "sales-contacts", "demo");
const demoQrImagePath = join(demoDirectory, "wechat-qr.png");
const publicDirectory = join(process.cwd(), "public");

function resolvePublicAssetPath(assetPath: string) {
  expect(assetPath).toMatch(/^\/(?!\/)/);
  expect(assetPath).not.toMatch(/^(?:data|https?):/i);
  expect(assetPath).not.toContain("\\");
  expect(assetPath).not.toContain("docs/_local");
  expect(assetPath).not.toContain("xwechat_files");

  const decodedPath = decodeURIComponent(assetPath);
  expect(decodedPath).not.toMatch(/(?:^|\/)\.\.?(?:\/|$)/);

  const filePath = resolve(publicDirectory, `.${decodedPath}`);
  const pathFromPublic = relative(publicDirectory, filePath);
  expect(isAbsolute(pathFromPublic) || pathFromPublic.startsWith("..\\") || pathFromPublic === "..").toBe(false);
  return filePath;
}

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

test("每位已配置联系人仅引用存在的安全 public 资产", async () => {
  for (const [ref, contact] of Object.entries(salesContacts)) {
    for (const [field, assetPath] of Object.entries({
      qrCodePath: contact.qrCodePath,
      fullWechatCardPath: contact.fullWechatCardPath,
    })) {
      await expect(access(resolvePublicAssetPath(assetPath)), `${ref}.${field}`).resolves.toBeUndefined();
    }
  }
});

test("public 资产路径校验拒绝远程、数据和目录逃逸路径", () => {
  for (const unsafePath of [
    "https://example.com/contact.png",
    "data:image/png;base64,AAA",
    "/sales-contacts/../secret.png",
    "/sales-contacts/%2e%2e/secret.png",
    "/docs/_local/contact.png",
  ]) {
    expect(() => resolvePublicAssetPath(unsafePath)).toThrow();
  }
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

test("演示联系人资产独立存在且二维码只打开演示页面", async () => {
  await expect(access(demoQrImagePath)).resolves.toBeUndefined();

  expect(demoQrImagePath).not.toBe(qrImagePath);

  const qr = await decodeQr(demoQrImagePath);
  expect(qr?.data).toBe("https://restaurant-insurance-quote.netlify.app/?ref=demo");
});
