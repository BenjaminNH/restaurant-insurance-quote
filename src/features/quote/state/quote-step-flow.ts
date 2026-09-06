import type { Product, QuoteStep } from "@/features/quote/types";

/**
 * Returns the navigation model for the selected products. The returned list
 * is newly created on every call, so callers may safely use it as local UI
 * state without mutating the product selection.
 */
export function getQuoteSteps(products: readonly Product[]): QuoteStep[] {
  const steps: QuoteStep[] = ["STORE"];

  if (products.includes("EMPLOYERS")) {
    steps.push("EMPLOYER_PLAN", "EMPLOYEES");
  }

  if (products.includes("PUBLIC") || products.includes("FOOD")) {
    steps.push("LIABILITY_PLANS");
  }

  steps.push("RESULT");
  return steps;
}

export function getCompletedProgress(stepIndex: number, totalSteps: number) {
  if (totalSteps <= 1) return 100;

  const boundedIndex = Math.min(Math.max(stepIndex, 0), totalSteps - 1);
  return Math.round((boundedIndex / (totalSteps - 1)) * 100);
}
