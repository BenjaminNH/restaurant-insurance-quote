import { describe, expect, test } from "vitest";
import rawRules from "../../docs/餐饮保险报价器-MVP规则.json";
import { quoteRulesSchema } from "@/features/quote/schemas/quote-rules-schema";

describe("quoteRulesSchema", () => {
  test("接受已确认的 mvp-1.1 规则", () => {
    expect(quoteRulesSchema.parse(rawRules).schema_version).toBe("mvp-1.1");
  });

  test("拒绝缺失基础保费的公众险方案", () => {
    const broken = structuredClone(rawRules);
    delete (broken.public_liability.plans.P1 as {
      base_premium_per_store?: number;
    }).base_premium_per_store;

    expect(() => quoteRulesSchema.parse(broken)).toThrow();
  });

  test("拒绝未知的超界处理状态", () => {
    const broken = structuredClone(rawRules);
    broken.food_liability.area_bands[4].result = "UNKNOWN";

    expect(() => quoteRulesSchema.parse(broken)).toThrow();
  });
});
