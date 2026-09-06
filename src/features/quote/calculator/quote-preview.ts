import type { QuoteRules } from "@/features/quote/schemas/quote-rules-schema";
import type { QuoteInput, QuoteItem } from "@/features/quote/types";
import { calculateEmployersLiability } from "./employers-liability";
import { calculateLiabilityByArea } from "./liability-by-area";

export type QuotePreview = {
  items: QuoteItem[];
  knownSubtotal: number | null;
  manualQuoteCount: number;
  missingProductCount: number;
  employerPeopleShortfall: number | null;
};

/**
 * Calculates only the selected products whose inputs are already sufficient.
 * It intentionally does not call calculateQuote: final quote validation and
 * result semantics must stay separate from the in-progress UI summary.
 */
export function calculateQuotePreview(input: QuoteInput, rules: QuoteRules): QuotePreview {
  const items: QuoteItem[] = [];
  const counts = input.employeeCounts;
  const validCounts = Object.values(counts).every(
    (value) => Number.isInteger(value) && value >= 0,
  );
  const totalPeople = validCounts
    ? Object.values(counts).reduce((sum, value) => sum + value, 0)
    : 0;
  const minimum = rules.employers_liability.minimum_people_per_policy;
  const employerPeopleShortfall = input.products.includes("EMPLOYERS")
    ? Math.max(0, minimum - totalPeople)
    : null;

  if (
    input.products.includes("EMPLOYERS")
    && input.employerPlan
    && validCounts
    && totalPeople >= minimum
  ) {
    // MVP age eligibility is assumed true. The field remains on QuoteInput for
    // future underwriting integrations, while calculateQuote keeps its existing semantics.
    items.push(calculateEmployersLiability(input.employerPlan, counts, true, rules));
  }

  if (input.products.includes("PUBLIC") && input.publicPlan && input.area > 0) {
    items.push(calculateLiabilityByArea("PUBLIC", input.publicPlan, input.area, rules));
  }

  if (input.products.includes("FOOD") && input.foodPlan && input.area > 0) {
    items.push(calculateLiabilityByArea("FOOD", input.foodPlan, input.area, rules));
  }

  const quoted = items.filter((item) => item.status === "QUOTED");

  return {
    items,
    knownSubtotal: quoted.length
      ? quoted.reduce((sum, item) => sum + (item.premium ?? 0), 0)
      : null,
    manualQuoteCount: items.filter((item) => item.status === "MANUAL_QUOTE").length,
    missingProductCount: input.products.length - items.length,
    employerPeopleShortfall,
  };
}
