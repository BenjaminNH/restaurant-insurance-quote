import { expect, test } from "vitest";
import { getCompletedProgress, getQuoteSteps } from "@/features/quote/state/quote-step-flow";

test.each([2, 3, 4, 5])("首屏在共 %s 步时完成度都是 0", (total) => {
  expect(getCompletedProgress(0, total)).toBe(0);
});

test("中间步骤按已完成步骤计算，结果页为 100", () => {
  expect(getCompletedProgress(1, 5)).toBe(25);
  expect(getCompletedProgress(2, 5)).toBe(50);
  expect(getCompletedProgress(4, 5)).toBe(100);
});

test("没有选择险种时仅显示门店与险种和结果步骤", () => {
  expect(getQuoteSteps([])).toEqual(["STORE", "RESULT"]);
});

test("只选择公众险时流程收缩为三步", () => {
  expect(getQuoteSteps(["PUBLIC"])).toEqual([
    "STORE",
    "LIABILITY_PLANS",
    "RESULT",
  ]);
});

test("只选择食责险时流程收缩为三步", () => {
  expect(getQuoteSteps(["FOOD"])).toEqual([
    "STORE",
    "LIABILITY_PLANS",
    "RESULT",
  ]);
});

test("只选择雇主险时包含档位和员工步骤", () => {
  expect(getQuoteSteps(["EMPLOYERS"])).toEqual([
    "STORE",
    "EMPLOYER_PLAN",
    "EMPLOYEES",
    "RESULT",
  ]);
});

test("选择三险时显示完整五步", () => {
  expect(getQuoteSteps(["PUBLIC", "FOOD", "EMPLOYERS"])).toEqual([
    "STORE",
    "EMPLOYER_PLAN",
    "EMPLOYEES",
    "LIABILITY_PLANS",
    "RESULT",
  ]);
});
