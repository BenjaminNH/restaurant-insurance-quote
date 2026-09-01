import type { Product } from "@/features/quote/types";

export const siteConfig = {
  brand: "餐饮安心保",
  title: "餐饮门店保费智能预估",
  description:
    "填写餐饮门店经营信息，1 分钟获取公众责任险、食品安全责任险与雇主责任险的预估保费。",
  disclaimer: "预估保费仅供参考，最终以保险公司正式核保与保单为准",
  salesContact: "餐饮安心保顾问",
} as const;

export const productCopy: Record<
  Product,
  { label: string; description: string; price: string }
> = {
  EMPLOYERS: {
    label: "雇主责任险",
    description: "员工工伤、误工费用等，8 人起保（低于 8 人不保）",
    price: "按岗位与人数计费",
  },
  PUBLIC: {
    label: "公众责任险",
    description: "顾客在店内受伤、财物损失等第三者责任",
    price: "¥600 起 / 店 / 年",
  },
  FOOD: {
    label: "食品安全责任险",
    description: "食物中毒等食品安全事故赔偿责任",
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
