import { calculateEmployersLiability } from "./employers-liability";
import { calculateLiabilityByArea } from "./liability-by-area";
import type { QuoteRules } from "@/features/quote/schemas/quote-rules-schema";
import type { QuoteInput, QuoteItem, QuoteResult } from "@/features/quote/types";

export function calculateQuote(input: QuoteInput, rules: QuoteRules): QuoteResult {
  const items: QuoteItem[] = [];

  if (input.products.includes("PUBLIC") && input.publicPlan) {
    items.push(calculateLiabilityByArea("PUBLIC", input.publicPlan, input.area, rules));
  }

  if (input.products.includes("FOOD") && input.foodPlan) {
    items.push(calculateLiabilityByArea("FOOD", input.foodPlan, input.area, rules));
  }

  if (
    input.products.includes("EMPLOYERS") &&
    input.employerPlan &&
    input.allEmployeesAgeEligible !== undefined
  ) {
    items.push(
      calculateEmployersLiability(
        input.employerPlan,
        input.employeeCounts,
        input.allEmployeesAgeEligible,
        rules,
      ),
    );
  }

  if (items.length !== input.products.length) {
    return {
      status: "MISSING_INPUT",
      ruleVersion: rules.schema_version,
      items,
      knownSubtotal: null,
      totalPremium: null,
    };
  }

  const quoted = items.filter((item) => item.status === "QUOTED");
  const knownSubtotal =
    quoted.length > 0
      ? quoted.reduce((sum, item) => sum + (item.premium ?? 0), 0)
      : null;

  if (items.some((item) => item.status === "NOT_ELIGIBLE")) {
    return {
      status: "NOT_ELIGIBLE",
      ruleVersion: rules.schema_version,
      items,
      knownSubtotal,
      totalPremium: null,
    };
  }

  const manualCount = items.filter((item) => item.status === "MANUAL_QUOTE").length;

  if (manualCount === items.length) {
    return {
      status: "MANUAL_QUOTE",
      ruleVersion: rules.schema_version,
      items,
      knownSubtotal: null,
      totalPremium: null,
    };
  }

  if (manualCount > 0) {
    return {
      status: "PARTIAL_MANUAL",
      ruleVersion: rules.schema_version,
      items,
      knownSubtotal,
      totalPremium: null,
    };
  }

  return {
    status: "QUOTED",
    ruleVersion: rules.schema_version,
    items,
    knownSubtotal,
    totalPremium: knownSubtotal,
  };
}
