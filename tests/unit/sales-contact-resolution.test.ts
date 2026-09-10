import { describe, expect, test } from "vitest";
import {
  defaultSalesContact,
  resolveSalesContact,
} from "@/config/sales-contacts";

describe("resolveSalesContact", () => {
  test("resolves the ozj referral to 欧志军", () => {
    expect(resolveSalesContact("ozj")).toBe(defaultSalesContact);
  });

  test("resolves the demo referral to an explicitly different demonstration contact", () => {
    const demo = resolveSalesContact("demo");

    expect(demo).toMatchObject({
      name: "演示顾问",
      phone: "13800138000",
      qrHint: "演示二维码 · 扫码打开本页",
    });
    expect(demo.name).not.toBe(resolveSalesContact("ozj").name);
    expect(demo.phone).not.toBe(resolveSalesContact("ozj").phone);
  });

  test.each([undefined, null, "", "unknown"]) (
    "falls back to the default contact for %p",
    (ref) => {
      expect(resolveSalesContact(ref)).toBe(defaultSalesContact);
    },
  );

  test("does not resolve prototype keys", () => {
    expect(resolveSalesContact("__proto__")).toBe(defaultSalesContact);
  });
});
