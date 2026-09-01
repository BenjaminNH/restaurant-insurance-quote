import type { QuoteRules } from "@/features/quote/schemas/quote-rules-schema";
import type {
  FoodPlan,
  Product,
  PublicPlan,
  QuoteItem,
} from "@/features/quote/types";

type LiabilityProduct = Extract<Product, "PUBLIC" | "FOOD">;

export function calculateLiabilityByArea(
  product: LiabilityProduct,
  plan: PublicPlan | FoodPlan,
  area: number,
  rules: QuoteRules,
): QuoteItem {
  const section = product === "PUBLIC" ? rules.public_liability : rules.food_liability;
  const basePremium =
    product === "PUBLIC"
      ? rules.public_liability.plans[plan as PublicPlan].base_premium_per_store
      : rules.food_liability.plans[plan as FoodPlan].base_premium_per_store;
  const band = section.area_bands.find((candidate) => {
    const aboveMin =
      "min_exclusive" in candidate
        ? area > candidate.min_exclusive
        : area >= candidate.min_inclusive;
    const belowMax = candidate.max_exclusive === null || area < candidate.max_exclusive;

    return aboveMin && belowMax;
  });

  if (!band || "result" in band) {
    return {
      product,
      status: "MANUAL_QUOTE",
      premium: null,
      reasonCode: "AREA_LIMIT",
      calculation: null,
    };
  }

  const premium = basePremium * band.factor;

  return {
    product,
    status: "QUOTED",
    premium,
    calculation: `${basePremium} × ${band.factor}`,
  };
}
