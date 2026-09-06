// @vitest-environment jsdom
import { beforeEach, expect, test } from "vitest";
import {
  clearQuoteDraft,
  loadQuoteDraft,
  saveQuoteDraft,
} from "@/features/quote/state/quote-draft-storage";
import type { QuoteInput } from "@/features/quote/types";

const storageKey = "restaurant-quote:draft:v1";
const draft: QuoteInput = {
  products: ["PUBLIC"],
  area: 260,
  publicPlan: "P2",
  employeeCounts: {
    BACK_OFFICE_OR_CASHIER: 0,
    WAITER: 0,
    CHEF_OR_CLEANER: 0,
  },
};

beforeEach(() => {
  sessionStorage.clear();
});

test("保存并恢复同规则版本草稿", () => {
  saveQuoteDraft(draft);

  expect(loadQuoteDraft()).toMatchObject({ area: 260, publicPlan: "P2" });
  expect(JSON.parse(sessionStorage.getItem(storageKey) ?? "null")).toMatchObject(
    {
      draftVersion: 1,
      ruleVersion: "mvp-1.1",
      values: draft,
    },
  );
});

test("旧草稿没有年龄字段时恢复为默认合规", () => {
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      draftVersion: 1,
      ruleVersion: "mvp-1.1",
      savedAt: new Date().toISOString(),
      values: {
        products: ["EMPLOYERS"],
        area: 260,
        employerPlan: "UPGRADED",
        employeeCounts: {
          BACK_OFFICE_OR_CASHIER: 0,
          WAITER: 8,
          CHEF_OR_CLEANER: 0,
        },
      },
    }),
  );

  expect(loadQuoteDraft()?.allEmployeesAgeEligible).toBe(true);
});

test("损坏草稿返回 null 并自动清除", () => {
  sessionStorage.setItem(storageKey, "broken-json");

  expect(loadQuoteDraft()).toBeNull();
  expect(sessionStorage.length).toBe(0);
});

test("结构或规则版本不兼容的草稿会被清除", () => {
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      draftVersion: 99,
      ruleVersion: "mvp-0.1",
      savedAt: new Date().toISOString(),
      values: draft,
    }),
  );

  expect(loadQuoteDraft()).toBeNull();
  expect(sessionStorage.getItem(storageKey)).toBeNull();
});

test("无法通过输入校验的草稿会被清除", () => {
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      draftVersion: 1,
      ruleVersion: "mvp-1.1",
      savedAt: new Date().toISOString(),
      values: { ...draft, area: -1 },
    }),
  );

  expect(loadQuoteDraft()).toBeNull();
  expect(sessionStorage.getItem(storageKey)).toBeNull();
});

test("过期草稿返回 null 并自动清除", () => {
  const expiredAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      draftVersion: 1,
      ruleVersion: "mvp-1.1",
      savedAt: expiredAt,
      values: draft,
    }),
  );

  expect(loadQuoteDraft()).toBeNull();
  expect(sessionStorage.getItem(storageKey)).toBeNull();
});

test("可以主动清除草稿", () => {
  saveQuoteDraft(draft);
  clearQuoteDraft();

  expect(loadQuoteDraft()).toBeNull();
});
