import QRCode from "qrcode";
import sharp from "sharp";
import { describe, expect, test } from "vitest";
import {
  decodeQrImage,
  extractWechatQr,
} from "../../scripts/wechat-card/image-processor";

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
});
