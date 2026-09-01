import { expect, test } from "vitest";
import { quoteInputSchema } from "@/features/quote/schemas/quote-input-schema";

const emptyCounts = {
  BACK_OFFICE_OR_CASHIER: 0,
  WAITER: 0,
  CHEF_OR_CLEANER: 0,
};

test("公众险需要公众险方案", () => {
  const result = quoteInputSchema.safeParse({
    products: ["PUBLIC"],
    area: 260,
    employeeCounts: emptyCounts,
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({ path: ["publicPlan"] }),
    );
  }
});

test("食品安全责任险需要食品安全责任险方案", () => {
  const result = quoteInputSchema.safeParse({
    products: ["FOOD"],
    area: 260,
    employeeCounts: emptyCounts,
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({ path: ["foodPlan"] }),
    );
  }
});

test("雇主险需要档位和明确年龄答案", () => {
  const result = quoteInputSchema.safeParse({
    products: ["EMPLOYERS"],
    area: 260,
    employerPlan: "UPGRADED",
    employeeCounts: { ...emptyCounts, WAITER: 8 },
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({ path: ["allEmployeesAgeEligible"] }),
    );
  }
});

test("雇主险缺少档位时报告档位错误", () => {
  const result = quoteInputSchema.safeParse({
    products: ["EMPLOYERS"],
    area: 260,
    allEmployeesAgeEligible: true,
    employeeCounts: { ...emptyCounts, WAITER: 8 },
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({ path: ["employerPlan"] }),
    );
  }
});

test("人数必须是非负整数且经营面积必须大于零", () => {
  const result = quoteInputSchema.safeParse({
    products: ["PUBLIC"],
    area: 0,
    publicPlan: "P1",
    employeeCounts: { ...emptyCounts, WAITER: 1.5 },
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ["area"] }),
        expect.objectContaining({ path: ["employeeCounts", "WAITER"] }),
      ]),
    );
  }
});

test("至少需要选择一个险种", () => {
  const result = quoteInputSchema.safeParse({
    products: [],
    area: 260,
    employeeCounts: emptyCounts,
  });

  expect(result.success).toBe(false);
});

test("接受完整三险输入", () => {
  const result = quoteInputSchema.safeParse({
    products: ["PUBLIC", "FOOD", "EMPLOYERS"],
    area: 260,
    publicPlan: "P2",
    foodPlan: "P1",
    employerPlan: "UPGRADED",
    employeeCounts: {
      BACK_OFFICE_OR_CASHIER: 2,
      WAITER: 6,
      CHEF_OR_CLEANER: 4,
    },
    allEmployeesAgeEligible: true,
  });

  expect(result.success).toBe(true);
});
