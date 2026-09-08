import { readFile } from "node:fs/promises";
import { join } from "node:path";
import jsQR from "jsqr";
import sharp from "sharp";
import { expect, test } from "vitest";

test("演示联系人二维码使用品牌绿色并指向当前预览站点", async () => {
  const imagePath = join(process.cwd(), "public", "sales-contact-zhangsan-qr.png");
  const { data, info } = await sharp(await readFile(imagePath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  const greenPixelCount = Array.from({ length: info.width * info.height }, (_, index) => index * 4)
    .filter((index) => data[index] < 80 && data[index + 1] > 120 && data[index + 2] < 130)
    .length;

  expect(decoded?.data).toBe("https://restaurant-insurance-quote.netlify.app/");
  expect(greenPixelCount).toBeGreaterThan(100);
});

test("演示完整名片保持竖版比例且不复用本地私人文件", async () => {
  const imagePath = join(process.cwd(), "public", "sales-contact-zhangsan-wechat-card.png");
  const metadata = await sharp(await readFile(imagePath)).metadata();

  expect(metadata.width).toBe(654);
  expect(metadata.height).toBe(972);
  expect(imagePath).not.toContain("docs/_local");
});
