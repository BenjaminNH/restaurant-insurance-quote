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

interface StyledQrFallback {
  data: string;
  qr: Buffer;
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

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel * 0.45).toString(16).padStart(2, "0"))
    .join("")}`;
}

async function normalizeStyledQr(
  source: Buffer,
  imageSize: ImageSize,
): Promise<StyledQrFallback | null> {
  const region = calculateTemplateCrop(imageSize);
  const { data, info } = await sharp(source)
    .extract(region)
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const modules = 37;
  const outputSize = 512;
  const quietZone = 0;
  const moduleSize = 10;
  const startX = Math.round(region.width * 0.055);
  const startY = Math.round(region.height * 0.09);
  const sourceModuleSize = region.width * 0.0243;
  const cells: string[] = [];

  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      const sampleX = Math.min(
        info.width - 1,
        Math.round(startX + (column + 0.5) * sourceModuleSize),
      );
      const sampleY = Math.min(
        info.height - 1,
        Math.round(startY + (row + 0.5) * sourceModuleSize),
      );
      const offset = (sampleY * info.width + sampleX) * info.channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const isColoredModule = (red + green + blue) / 3 < 220;

      if (isColoredModule) {
        cells.push(
          `<rect x="${quietZone + column * moduleSize}" y="${quietZone + row * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="${rgbToHex(red, green, blue)}"/>`,
        );
      }
    }
  }

  const qr = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${outputSize}" height="${outputSize}"><rect width="100%" height="100%" fill="white"/>${cells.join("")}</svg>`,
    ),
  )
    .extract({ left: 0, top: 0, width: modules * moduleSize, height: modules * moduleSize })
    .resize(outputSize, outputSize, { fit: "fill", kernel: "nearest" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const decoded = await decodeQrImage(qr);

  return decoded ? { data: decoded.data, qr } : null;
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
  const styledQr = sourceQr ? null : await normalizeStyledQr(normalized, imageSize);
  const method = sourceQr || styledQr ? "detected" : "template";
  const region = sourceQr
    ? calculateQrCrop(sourceQr.location, imageSize)
    : calculateTemplateCrop(imageSize);
  const qr = styledQr
    ? styledQr.qr
    : await sharp(normalized)
      .extract(region)
      .resize(512, 512, { fit: "fill", kernel: "nearest" })
      .png({ compressionLevel: 9 })
      .toBuffer();
  const verifiedQr = await decodeQrImage(qr);

  if (!verifiedQr) {
    throw new Error("裁切后的二维码无法识别");
  }
  const sourceData = sourceQr?.data ?? styledQr?.data;
  if (sourceData && verifiedQr.data !== sourceData) {
    throw new Error("裁切前后的二维码内容不一致");
  }

  return { qr, method };
}
