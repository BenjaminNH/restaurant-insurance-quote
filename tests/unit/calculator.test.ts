import { describe, expect, test } from "vitest";
import { quoteRules } from "@/config/quote-rules";
import { calculateQuote } from "@/features/quote/calculator/calculate-quote";
import { calculateEmployersLiability } from "@/features/quote/calculator/employers-liability";
import { calculateLiabilityByArea, getLiabilityAreaOutcome } from "@/features/quote/calculator/liability-by-area";
import { roundCny } from "@/features/quote/calculator/money";

describe("面积责任险", () => {
  test("面积匹配结果可供界面显示系数", () => {
    expect(getLiabilityAreaOutcome("PUBLIC", 260, quoteRules))
      .toEqual({ status: "FACTOR", factor: 1.8 });
    expect(getLiabilityAreaOutcome("FOOD", 260, quoteRules))
      .toEqual({ status: "FACTOR", factor: 1.5 });
  });

  test("超出面积时返回人工报价状态", () => {
    expect(getLiabilityAreaOutcome("FOOD", 2500, quoteRules))
      .toEqual({ status: "MANUAL_QUOTE" });
  });

  test.each([
    [99.99, 1],
    [100, 1.8],
    [499.99, 1.8],
    [500, 2.5],
    [999.99, 2.5],
    [1000, 3.5],
    [2999.99, 3.5],
  ])("公众险面积 %s 使用系数 %s", (area, factor) => {
    const item = calculateLiabilityByArea("PUBLIC", "P2", area, quoteRules);

    expect(item.premium).toBe(800 * factor);
  });

  test("公众险 3000 平方米转人工报价", () => {
    expect(calculateLiabilityByArea("PUBLIC", "P2", 3000, quoteRules)).toMatchObject({
      status: "MANUAL_QUOTE",
      premium: null,
      reasonCode: "AREA_LIMIT",
    });
  });

  test.each([
    [99.99, 0.8],
    [100, 1.5],
    [499.99, 1.5],
    [500, 2.4],
    [999.99, 2.4],
    [1000, 3.6],
    [1999.99, 3.6],
  ])("食责险面积 %s 使用系数 %s", (area, factor) => {
    const item = calculateLiabilityByArea("FOOD", "P3", area, quoteRules);

    expect(item.premium).toBe(2000 * factor);
  });

  test("食责险 2000 平方米转人工报价", () => {
    expect(calculateLiabilityByArea("FOOD", "P1", 2000, quoteRules).status).toBe(
      "MANUAL_QUOTE",
    );
  });
});

test("人民币最终展示按半入规则取整", () => {
  expect(roundCny(100.49)).toBe(100);
  expect(roundCny(100.5)).toBe(101);
});

const counts = { BACK_OFFICE_OR_CASHIER: 2, WAITER: 6, CHEF_OR_CLEANER: 4 };

describe("雇主责任险", () => {
  test("7 人不符合承保条件", () => {
    const item = calculateEmployersLiability(
      "UPGRADED",
      { BACK_OFFICE_OR_CASHIER: 1, WAITER: 3, CHEF_OR_CLEANER: 3 },
      true,
      quoteRules,
    );

    expect(item).toMatchObject({
      status: "NOT_ELIGIBLE",
      premium: null,
      reasonCode: "MINIMUM_PEOPLE",
    });
  });

  test("8 人进入自动报价", () => {
    const item = calculateEmployersLiability(
      "BASIC",
      { BACK_OFFICE_OR_CASHIER: 0, WAITER: 8, CHEF_OR_CLEANER: 0 },
      true,
      quoteRules,
    );

    expect(item.premium).toBe(448);
  });

  test("年龄不符合时转人工报价", () => {
    expect(calculateEmployersLiability("UPGRADED", counts, false, quoteRules).status).toBe(
      "MANUAL_QUOTE",
    );
  });

  test("设计正常路径雇主险为 1344 元", () => {
    expect(calculateEmployersLiability("UPGRADED", counts, true, quoteRules).premium).toBe(
      1344,
    );
  });
});

describe("整体报价", () => {
  test("设计正常路径总价为 3984 元", () => {
    const result = calculateQuote(
      {
        products: ["PUBLIC", "FOOD", "EMPLOYERS"],
        area: 260,
        publicPlan: "P2",
        foodPlan: "P1",
        employerPlan: "UPGRADED",
        employeeCounts: counts,
        allEmployeesAgeEligible: true,
      },
      quoteRules,
    );

    expect(result).toMatchObject({
      status: "QUOTED",
      knownSubtotal: 3984,
      totalPremium: 3984,
    });
  });

  test("规则文档示例总价为 5432 元", () => {
    const result = calculateQuote(
      {
        products: ["PUBLIC", "FOOD", "EMPLOYERS"],
        area: 350,
        publicPlan: "P2",
        foodPlan: "P3",
        employerPlan: "UPGRADED",
        employeeCounts: { BACK_OFFICE_OR_CASHIER: 2, WAITER: 4, CHEF_OR_CLEANER: 3 },
        allEmployeesAgeEligible: true,
      },
      quoteRules,
    );

    expect(result.totalPremium).toBe(5432);
  });

  test("食责险超面积时保留其他险种小计但不显示最终总价", () => {
    const result = calculateQuote(
      {
        products: ["PUBLIC", "FOOD"],
        area: 2500,
        publicPlan: "P1",
        foodPlan: "P1",
        employeeCounts: { BACK_OFFICE_OR_CASHIER: 0, WAITER: 0, CHEF_OR_CLEANER: 0 },
      },
      quoteRules,
    );

    expect(result).toMatchObject({
      status: "PARTIAL_MANUAL",
      knownSubtotal: 2100,
      totalPremium: null,
    });
  });

  test("所有已选险种都需人工报价时不展示小计", () => {
    const result = calculateQuote(
      {
        products: ["PUBLIC"],
        area: 3000,
        publicPlan: "P1",
        employeeCounts: { BACK_OFFICE_OR_CASHIER: 0, WAITER: 0, CHEF_OR_CLEANER: 0 },
      },
      quoteRules,
    );

    expect(result).toMatchObject({
      status: "MANUAL_QUOTE",
      knownSubtotal: null,
      totalPremium: null,
    });
  });

  test("不符合承保条件时保留其他险种已知小计", () => {
    const result = calculateQuote(
      {
        products: ["PUBLIC", "EMPLOYERS"],
        area: 260,
        publicPlan: "P1",
        employerPlan: "BASIC",
        employeeCounts: { BACK_OFFICE_OR_CASHIER: 0, WAITER: 7, CHEF_OR_CLEANER: 0 },
        allEmployeesAgeEligible: true,
      },
      quoteRules,
    );

    expect(result).toMatchObject({
      status: "NOT_ELIGIBLE",
      knownSubtotal: 1080,
      totalPremium: null,
    });
  });

  test("缺少所选险种方案时返回输入不完整", () => {
    const result = calculateQuote(
      {
        products: ["PUBLIC"],
        area: 260,
        employeeCounts: { BACK_OFFICE_OR_CASHIER: 0, WAITER: 0, CHEF_OR_CLEANER: 0 },
      },
      quoteRules,
    );

    expect(result).toMatchObject({
      status: "MISSING_INPUT",
      knownSubtotal: null,
      totalPremium: null,
    });
  });
});
