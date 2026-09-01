export const products = ["PUBLIC", "FOOD", "EMPLOYERS"] as const;

export type Product = (typeof products)[number];
export type PublicPlan = "P1" | "P2" | "P3" | "P4";
export type FoodPlan = "P1" | "P2" | "P3";
export type EmployerPlan = "BASIC" | "UPGRADED" | "PREMIUM" | "ULTIMATE";
export type EmployerRole =
  | "BACK_OFFICE_OR_CASHIER"
  | "WAITER"
  | "CHEF_OR_CLEANER";
export type QuoteStatus =
  | "QUOTED"
  | "NOT_ELIGIBLE"
  | "MANUAL_QUOTE"
  | "PARTIAL_MANUAL"
  | "MISSING_INPUT";

export type QuoteInput = {
  products: Product[];
  area: number;
  publicPlan?: PublicPlan;
  foodPlan?: FoodPlan;
  employerPlan?: EmployerPlan;
  employeeCounts: Record<EmployerRole, number>;
  allEmployeesAgeEligible?: boolean;
};

export type QuoteItem = {
  product: Product;
  status: Exclude<QuoteStatus, "PARTIAL_MANUAL" | "MISSING_INPUT">;
  premium: number | null;
  reasonCode?: "AREA_LIMIT" | "MINIMUM_PEOPLE" | "AGE_RANGE";
  calculation: string | null;
};

export type QuoteResult = {
  status: QuoteStatus;
  ruleVersion: string;
  items: QuoteItem[];
  knownSubtotal: number | null;
  totalPremium: number | null;
};

export type QuoteStep =
  | "STORE"
  | "EMPLOYER_PLAN"
  | "EMPLOYEES"
  | "LIABILITY_PLANS"
  | "RESULT";
