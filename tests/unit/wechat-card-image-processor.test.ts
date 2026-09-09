import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { describe, expect, test } from "vitest";
import {
  decodeQrImage,
  extractWechatQr,
} from "../../scripts/wechat-card/image-processor";

const localGreenWechatCard = join(
  process.cwd(),
  "docs",
  "_local",
  "wechat-cards",
  "input",
  "personal-wechat-card.jpg",
);

async function createGradientDotWechatCard(payload: string, colors: readonly [string, string]) {
  const code = QRCode.create(payload, {
    version: 5,
    errorCorrectionLevel: "M",
  });
  const moduleSize = 20;
  const modules = code.modules.size;
  const dots = Array.from({ length: modules * modules }, (_, index) => {
    const row = Math.floor(index / modules);
    const column = index % modules;
    return code.modules.get(row, column)
      ? `<rect x="${column * moduleSize + 3}" y="${row * moduleSize + 3}" width="14" height="14" rx="4" fill="url(#gradient)"/>`
      : "";
  }).join("");
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${modules * moduleSize}" height="${modules * moduleSize}">
      <defs><linearGradient id="gradient" x1="0" x2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs>
      <rect width="100%" height="100%" fill="white"/>
      ${dots}
    </svg>
  `);

  return sharp({
    create: {
      width: 1056,
      height: 1645,
      channels: 3,
      background: "#FFFFFF",
    },
  })
    .composite([{ input: svg, left: 158, top: 513 }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

describe("extractWechatQr", () => {
  test("decodes a WeChat-green QR code stored as JPEG", async () => {
    const payload = "contact:synthetic";
    const png = await QRCode.toBuffer(payload, {
      type: "png",
      width: 512,
      margin: 4,
      color: { dark: "#07C160", light: "#FFFFFF" },
    });
    const jpeg = await sharp(png).jpeg({ quality: 90 }).toBuffer();

    expect((await decodeQrImage(jpeg))?.data).toBe(payload);
  });

  test.skipIf(!existsSync(localGreenWechatCard))(
    "preserves the payload from the local green WeChat card without exposing it",
    async () => {
      const card = await readFile(localGreenWechatCard);
      const source = await decodeQrImage(card);
      const result = await extractWechatQr(card);
      const output = await decodeQrImage(result.qr);

      expect(source).not.toBeNull();
      expect(output?.data).toBe(source?.data);
    },
  );

  test("locates, crops, and verifies a QR code inside a portrait card", async () => {
    const payload = "https://example.com/contact/alice";
    const sourceQr = await QRCode.toBuffer(payload, {
      type: "png",
      width: 360,
      margin: 4,
      color: { dark: "#07C160", light: "#FFFFFF" },
    });
    const card = await sharp({
      create: {
        width: 820,
        height: 1219,
        channels: 4,
        background: "#FFFFFF",
      },
    })
      .composite([{ input: sourceQr, left: 230, top: 420 }])
      .png()
      .toBuffer();

    const result = await extractWechatQr(card);
    const metadata = await sharp(result.qr).metadata();
    const decoded = await decodeQrImage(result.qr);

    expect(result.method).toBe("detected");
    expect(metadata).toMatchObject({ format: "png", width: 512, height: 512 });
    expect(decoded?.data).toBe(payload);
  });

  test.each([
    ["微信绿", ["#07C160", "#11998E"]],
    ["深蓝紫", ["#1976D2", "#5E35B1"]],
    ["红紫渐变", ["#E75757", "#A25BD1"]],
    ["深灰双色", ["#202124", "#5F6368"]],
  ] as const)("normalizes a %s dot QR code without relying on its color", async (_, colors) => {
    const payload = "https://example.com/contact/styled-qr";
    const card = await createGradientDotWechatCard(payload, colors);

    expect(await decodeQrImage(card)).toBeNull();

    const result = await extractWechatQr(card);
    const decoded = await decodeQrImage(result.qr);

    expect(result.method).toBe("detected");
    expect(decoded?.data).toBe(payload);
  });

  test("rejects a QR code whose contrast is too low to identify reliably", async () => {
    const card = await createGradientDotWechatCard(
      "https://example.com/contact/low-contrast",
      ["#FAFAFA", "#F5F5F5"],
    );

    await expect(extractWechatQr(card)).rejects.toThrow("裁切后的二维码无法识别");
  });
});
