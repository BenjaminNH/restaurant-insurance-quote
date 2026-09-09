import type { Product } from "@/features/quote/types";

export const siteConfig = {
  brand: "餐饮安心保",
  title: "保费智能预估",
  disclaimer: "预估保费仅供参考，最终以保险公司正式核保与保单为准",
} as const;

export type SalesContact = {
  name: string;
  phone: string;
  wechatSameAsPhone: boolean;
  qrCodePath: string;
  fullWechatCardPath: string;
};

export const defaultSalesContact: SalesContact = {
  name: "欧志军",
  phone: "13342551879",
  wechatSameAsPhone: true,
  qrCodePath: "/sales-contacts/ou-zhijun/wechat-qr.png",
  fullWechatCardPath: "/sales-contacts/ou-zhijun/wechat-card.jpg",
};

export const productCopy: Record<
  Product,
  { label: string; description: string; price: string }
> = {
  EMPLOYERS: {
    label: "雇主责任险",
    description: "员工工作期间发生意外时提供保障，8 人起保",
    price: "按岗位与人数计费",
  },
  PUBLIC: {
    label: "公众责任险",
    description: "顾客在店内发生意外或财物损失时提供保障",
    price: "¥600 起 / 店 / 年",
  },
  FOOD: {
    label: "食品安全责任险",
    description: "食品安全事故造成损失时提供保障",
    price: "¥800 起 / 店 / 年",
  },
};

export const productOrder: Product[] = ["EMPLOYERS", "PUBLIC", "FOOD"];

export const employerPlanCopy = {
  BASIC: "基础版",
  UPGRADED: "升级版",
  PREMIUM: "高端版",
  ULTIMATE: "尊享版",
} as const;

export const employerRoleCopy = {
  BACK_OFFICE_OR_CASHIER: { label: "内勤 / 收银人数", short: "内勤 / 收银" },
  WAITER: { label: "服务员人数", short: "服务员" },
  CHEF_OR_CLEANER: { label: "厨师 / 保洁人数", short: "厨师 / 保洁" },
} as const;

export const publicPlanCopy = {
  P1: "公众责任险方案 P1",
  P2: "公众责任险方案 P2",
  P3: "公众责任险方案 P3",
  P4: "公众责任险方案 P4",
} as const;

export const foodPlanCopy = {
  P1: "食品安全责任险方案一",
  P2: "食品安全责任险方案二",
  P3: "食品安全责任险方案三",
} as const;
