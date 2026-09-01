import type { QuoteRules } from "@/features/quote/schemas/quote-rules-schema";
import type {
  EmployerPlan,
  EmployerRole,
  QuoteItem,
} from "@/features/quote/types";

export function calculateEmployersLiability(
  plan: EmployerPlan,
  counts: Record<EmployerRole, number>,
  allEmployeesAgeEligible: boolean,
  rules: QuoteRules,
): QuoteItem {
  const totalPeople = Object.values(counts).reduce((sum, count) => sum + count, 0);

  if (totalPeople < rules.employers_liability.minimum_people_per_policy) {
    return {
      product: "EMPLOYERS",
      status: "NOT_ELIGIBLE",
      premium: null,
      reasonCode: "MINIMUM_PEOPLE",
      calculation: null,
    };
  }

  if (!allEmployeesAgeEligible) {
    return {
      product: "EMPLOYERS",
      status: "MANUAL_QUOTE",
      premium: null,
      reasonCode: "AGE_RANGE",
      calculation: null,
    };
  }

  const rates = rules.employers_liability.plans[plan].annual_rate_by_role;
  const premium = Object.entries(counts).reduce(
    (sum, [role, count]) => sum + rates[role as EmployerRole] * count,
    0,
  );

  return {
    product: "EMPLOYERS",
    status: "QUOTED",
    premium,
    calculation: `${counts.BACK_OFFICE_OR_CASHIER}×${rates.BACK_OFFICE_OR_CASHIER} + ${counts.WAITER}×${rates.WAITER} + ${counts.CHEF_OR_CLEANER}×${rates.CHEF_OR_CLEANER}`,
  };
}
