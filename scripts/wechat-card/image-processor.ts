import jsQR, { type QRCode } from "jsqr";
import sharp from "sharp";
import {
  calculateQrCrop,
  calculateTemplateCrop,
  type ImageSize,
} from "./qr-crop";

export interface ExtractedWechatQr {
  qr: Buffer;
  method: "detected" | "template";
}

async function normalizeImage(image: Buffer) {
  return sharp(image).autoOrient().png().toBuffer();
}

async function scanQrPixels(image: Buffer): Promise<QRCode | null> {
  const { data, info } = await sharp(image)
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(
    data.buffer,
    data.byteOffset,
    data.byteLength,
  );

  return jsQR(pixels, info.width, info.height, {
    inversionAttempts: "dontInvert",
  });
}

export async function decodeQrImage(image: Buffer): Promise<QRCode | null> {
  const directResult = await scanQrPixels(image);
  if (directResult) return directResult;

  const highContrast = await sharp(image)
    .greyscale()
    .threshold(180)
    .png()
    .toBuffer();
  return scanQrPixels(highContrast);
}

export async function extractWechatQr(
  source: Buffer,
): Promise<ExtractedWechatQr> {
  const normalized = await normalizeImage(source);
  const metadata = await sharp(normalized).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("无法读取名片图片尺寸");
  }

  const imageSize: ImageSize = {
    width: metadata.width,
    height: metadata.height,
  };
  const sourceQr = await decodeQrImage(normalized);
  const method = sourceQr ? "detected" : "template";
  const region = sourceQr
    ? calculateQrCrop(sourceQr.location, imageSize)
    : calculateTemplateCrop(imageSize);
  const qr = await sharp(normalized)
    .extract(region)
    .resize(512, 512, { fit: "fill", kernel: "nearest" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const verifiedQr = await decodeQrImage(qr);

  if (!verifiedQr) {
    throw new Error("裁切后的二维码无法识别");
  }
  if (sourceQr && verifiedQr.data !== sourceQr.data) {
    throw new Error("裁切前后的二维码内容不一致");
  }

  return { qr, method };
}
