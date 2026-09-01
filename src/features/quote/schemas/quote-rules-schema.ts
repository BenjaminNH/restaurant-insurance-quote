import { z } from "zod";

const areaBandSchema = z.union([
  z.object({
    min_exclusive: z.number(),
    max_exclusive: z.number(),
    factor: z.number().positive(),
  }),
  z.object({
    min_inclusive: z.number(),
    max_exclusive: z.number(),
    factor: z.number().positive(),
  }),
  z.object({
    min_inclusive: z.number(),
    max_exclusive: z.null(),
    result: z.literal("MANUAL_QUOTE"),
  }),
]);

const liabilityPlanSchema = z
  .object({
    aggregate_limit_10k: z.number().positive(),
    per_accident_limit_10k: z.number().positive(),
    per_person_limit_10k: z.number().positive(),
    per_person_medical_limit_10k: z.number().positive(),
    base_premium_per_store: z.number().positive(),
  })
  .passthrough();

const roleRatesSchema = z.object({
  BACK_OFFICE_OR_CASHIER: z.number().positive(),
  WAITER: z.number().positive(),
  CHEF_OR_CLEANER: z.number().positive(),
});

const employerPlanSchema = z.object({
  death_disability_limit_10k_per_person: z.number().positive(),
  medical_limit_10k_per_person: z.number().positive(),
  annual_rate_by_role: roleRatesSchema,
});

export const quoteRulesSchema = z
  .object({
    schema_version: z.literal("mvp-1.1"),
    rule_status: z.literal("MVP_CONFIRMED"),
    currency: z.literal("CNY"),
    disclaimer: z.string().min(1),
    calculation_defaults: z
      .object({
        area_accepts_decimals: z.literal(true),
        area_rounding_before_band_match: z.literal("NONE"),
        final_rounding: z.literal("ROUND_HALF_UP_TO_YUAN"),
      })
      .passthrough(),
    public_liability: z
      .object({
        plans: z.record(z.enum(["P1", "P2", "P3", "P4"]), liabilityPlanSchema),
        area_bands: z.array(areaBandSchema).min(2),
        deductible: z.string().min(1),
      })
      .passthrough(),
    food_liability: z
      .object({
        plans: z.record(z.enum(["P1", "P2", "P3"]), liabilityPlanSchema),
        area_bands: z.array(areaBandSchema).min(2),
        deductible: z.string().min(1),
        food_production_license_required: z.literal(true),
      })
      .passthrough(),
    employers_liability: z
      .object({
        minimum_people_per_policy: z.literal(8),
        minimum_people_failure_result: z.literal("NOT_ELIGIBLE"),
        age_min_inclusive: z.literal(16),
        age_max_inclusive: z.literal(65),
        out_of_age_range_result: z.literal("MANUAL_QUOTE"),
        daily_lost_wage_benefit: z.number().positive(),
        plans: z.record(
          z.enum(["BASIC", "UPGRADED", "PREMIUM", "ULTIMATE"]),
          employerPlanSchema,
        ),
        medical_deductible: z.string().min(1),
        lost_wage_deductible: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough();

export type QuoteRules = z.infer<typeof quoteRulesSchema>;
