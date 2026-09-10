export interface SalesContact {
  name: string;
  phone: string;
  wechatSameAsPhone: boolean;
  qrCodePath: string;
  fullWechatCardPath: string;
  qrHint?: string;
  qrAlt?: string;
}

export const salesContacts = {
  ozj: {
    name: "欧志军",
    phone: "13342551879",
    wechatSameAsPhone: true,
    qrCodePath: "/sales-contacts/ou-zhijun/wechat-qr.png",
    fullWechatCardPath: "/sales-contacts/ou-zhijun/wechat-card.jpg",
    qrHint: "长按识别加微信",
  },
  demo: {
    name: "演示顾问",
    phone: "13800138000",
    wechatSameAsPhone: false,
    qrCodePath: "/sales-contacts/demo/wechat-qr.png",
    fullWechatCardPath: "/sales-contacts/demo/wechat-qr.png",
    qrHint: "演示二维码 · 扫码打开本页",
    qrAlt: "演示顾问的演示二维码",
  },
} as const satisfies Record<string, SalesContact>;

export const defaultSalesContact = salesContacts.ozj;

export function resolveSalesContact(ref: string | null | undefined): SalesContact {
  if (ref && Object.hasOwn(salesContacts, ref)) {
    return salesContacts[ref as keyof typeof salesContacts];
  }

  return defaultSalesContact;
}
