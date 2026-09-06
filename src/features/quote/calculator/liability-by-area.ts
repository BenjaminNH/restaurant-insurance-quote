import type { QuoteRules } from "@/features/quote/schemas/quote-rules-schema";
import type {
  FoodPlan,
  Product,
  PublicPlan,
  QuoteItem,
} from "@/features/quote/types";

export type LiabilityProduct = Extract<Product, "PUBLIC" | "FOOD">;

export type LiabilityAreaOutcome =
  | { status: "FACTOR"; factor: number }
  | { status: "MANUAL_QUOTE" };

export function getLiabilityAreaOutcome(
  product: LiabilityProduct,
  area: number,
  rules: QuoteRules,
): LiabilityAreaOutcome {
  const section = product === "PUBLIC" ? rules.public_liability : rules.food_liability;
  const band = section.area_bands.find((candidate) => {
    const aboveMin = "min_exclusive" in candidate
      ? area > candidate.min_exclusive
      : area >= candidate.min_inclusive;

    return aboveMin && (candidate.max_exclusive === null || area < candidate.max_exclusive);
  });

  if (!band || "result" in band) return { status: "MANUAL_QUOTE" };
  return { status: "FACTOR", factor: band.factor };
}

export function calculateLiabilityByArea(
  product: LiabilityProduct,
  plan: PublicPlan | FoodPlan,
  area: number,
  rules: QuoteRules,
): QuoteItem {
  const basePremium =
    product === "PUBLIC"
      ? rules.public_liability.plans[plan as PublicPlan].base_premium_per_store
      : rules.food_liability.plans[plan as FoodPlan].base_premium_per_store;
  const outcome = getLiabilityAreaOutcome(product, area, rules);

  if (outcome.status === "MANUAL_QUOTE") {
    return {
      product,
      status: "MANUAL_QUOTE",
      premium: null,
      reasonCode: "AREA_LIMIT",
      calculation: null,
    };
  }

  const premium = basePremium * outcome.factor;

  return {
    product,
    status: "QUOTED",
    premium,
    calculation: `${basePremium} × ${outcome.factor}`,
  };
}
