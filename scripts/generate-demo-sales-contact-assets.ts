import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";

const publicDirectory = join(process.cwd(), "public");
const siteUrl = "https://restaurant-insurance-quote.netlify.app/";
const qrCodeColors = { dark: "#07C160", light: "#FFFFFF" };

async function generateDemoAssets() {
  const qrCode = await QRCode.toBuffer(siteUrl, {
    type: "png",
    width: 104,
    margin: 1,
    errorCorrectionLevel: "M",
    color: qrCodeColors,
  });
  const cardQrCode = await QRCode.toBuffer(siteUrl, {
    type: "png",
    width: 230,
    margin: 2,
    errorCorrectionLevel: "M",
    color: qrCodeColors,
  });
  const card = Buffer.from(`
    <svg width="654" height="972" viewBox="0 0 654 972" xmlns="http://www.w3.org/2000/svg">
      <rect width="654" height="972" rx="32" fill="#f7f9fc"/>
      <rect x="28" y="28" width="598" height="916" rx="24" fill="#ffffff" stroke="#cbd8e8" stroke-width="2"/>
      <rect x="60" y="68" width="92" height="92" rx="22" fill="#213f67"/>
      <text x="106" y="127" fill="#ffffff" font-size="42" font-family="Microsoft YaHei, PingFang SC, sans-serif" text-anchor="middle">张</text>
      <text x="178" y="108" fill="#0f172a" font-size="32" font-weight="700" font-family="Microsoft YaHei, PingFang SC, sans-serif">张三</text>
      <text x="178" y="144" fill="#53647c" font-size="20" font-family="Microsoft YaHei, PingFang SC, sans-serif">餐饮保险咨询顾问</text>
      <line x1="60" y1="204" x2="594" y2="204" stroke="#e2e8f0" stroke-width="2"/>
      <text x="327" y="275" fill="#213f67" font-size="26" font-weight="700" font-family="Microsoft YaHei, PingFang SC, sans-serif" text-anchor="middle">扫码添加微信</text>
      <text x="327" y="314" fill="#53647c" font-size="20" font-family="Microsoft YaHei, PingFang SC, sans-serif" text-anchor="middle">电话：138 0000 0000（微信同号）</text>
      <rect x="196" y="362" width="262" height="262" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      <image href="data:image/png;base64,${cardQrCode.toString("base64")}" x="212" y="378" width="230" height="230"/>
      <rect x="60" y="708" width="534" height="1" fill="#e2e8f0"/>
      <text x="327" y="772" fill="#53647c" font-size="18" font-family="Microsoft YaHei, PingFang SC, sans-serif" text-anchor="middle">餐饮安心保 · 演示业务名片</text>
      <text x="327" y="810" fill="#53647c" font-size="16" font-family="Microsoft YaHei, PingFang SC, sans-serif" text-anchor="middle">报价仅供咨询早期预估</text>
    </svg>
  `);

  await Promise.all([
    writeFile(join(publicDirectory, "sales-contact-zhangsan-qr.png"), qrCode),
    sharp(card).png().toBuffer().then((image) => writeFile(join(publicDirectory, "sales-contact-zhangsan-wechat-card.png"), image)),
  ]);
}

generateDemoAssets().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
