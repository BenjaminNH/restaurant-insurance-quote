import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://restaurant-insurance-quote.netlify.app/";
const title = "餐饮安心保｜餐饮门店责任险保费智能预估";
const description = "快速预估公众责任险、食品安全责任险和雇主责任险保费";
const shareImage = {
  url: "/share-card.png",
  width: 1200,
  height: 630,
  alt: "餐饮安心保餐饮门店责任险保费智能预估",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [shareImage.url],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f9fc",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
