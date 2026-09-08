import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { metadata } from "@/app/layout";

const siteUrl = "https://restaurant-insurance-quote.netlify.app/";
const title = "餐饮安心保｜餐饮门店责任险保费智能预估";
const description = "快速预估公众责任险、食品安全责任险和雇主责任险保费";

test("输出完整的静态社交分享元数据", () => {
  expect(metadata.metadataBase?.toString()).toBe(siteUrl);
  expect(metadata).toMatchObject({
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      url: "/",
      siteName: "餐饮安心保",
      locale: "zh_CN",
      type: "website",
      images: [
        {
          url: "/share-thumbnail-v2.png",
          secureUrl: `${siteUrl}share-thumbnail-v2.png`,
          width: 600,
          height: 600,
          type: "image/png",
          alt: "餐饮安心保餐饮门店责任险保费智能预估",
        },
        {
          url: "/share-card.png",
          secureUrl: `${siteUrl}share-card.png`,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: "餐饮安心保餐饮门店责任险保费智能预估",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/share-card.png"],
    },
    icons: {
      icon: "/icon.svg",
      apple: "/apple-touch-icon.png",
    },
  });
});

test("社交分享图片和站点图标作为静态资源存在", () => {
  const publicDir = join(process.cwd(), "public");
  const shareCard = join(publicDir, "share-card.png");
  const shareThumbnail = join(publicDir, "share-thumbnail-v2.png");

  expect(existsSync(shareCard)).toBe(true);
  expect(existsSync(shareThumbnail)).toBe(true);
  expect(existsSync(join(publicDir, "icon.svg"))).toBe(true);
  expect(existsSync(join(publicDir, "apple-touch-icon.png"))).toBe(true);

  const cardImage = readFileSync(shareCard);
  expect(cardImage.subarray(1, 4).toString()).toBe("PNG");
  expect(cardImage.readUInt32BE(16)).toBe(1200);
  expect(cardImage.readUInt32BE(20)).toBe(630);

  const thumbnailImage = readFileSync(shareThumbnail);
  expect(thumbnailImage.subarray(1, 4).toString()).toBe("PNG");
  expect(thumbnailImage.readUInt32BE(16)).toBe(600);
  expect(thumbnailImage.readUInt32BE(20)).toBe(600);
});
