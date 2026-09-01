import { expect, test } from "vitest";
import { getQuoteSteps } from "@/features/quote/state/quote-step-flow";

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
