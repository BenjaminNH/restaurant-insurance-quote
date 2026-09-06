import { z } from "zod";

const productSchema = z.enum(["PUBLIC", "FOOD", "EMPLOYERS"]);

const employeeCountsSchema = z.object({
  BACK_OFFICE_OR_CASHIER: z.number().int().min(0, "人数不能小于 0"),
  WAITER: z.number().int().min(0, "人数不能小于 0"),
  CHEF_OR_CLEANER: z.number().int().min(0, "人数不能小于 0"),
});

/**
 * The unconditional part of a quote is also the payload persisted in a
 * session draft. Conditional product requirements are kept in
 * `quoteInputSchema`, so a draft can be saved while the user is midway
 * through a step.
 */
export const quoteDraftSchema = z.object({
  products: z.array(productSchema).min(1, "请至少选择一个险种"),
  area: z.number().positive("请输入大于 0 的经营面积"),
  publicPlan: z.enum(["P1", "P2", "P3", "P4"]).optional(),
  foodPlan: z.enum(["P1", "P2", "P3"]).optional(),
  employerPlan: z
    .enum(["BASIC", "UPGRADED", "PREMIUM", "ULTIMATE"])
    .optional(),
  employeeCounts: employeeCountsSchema,
  allEmployeesAgeEligible: z.boolean().optional().default(true),
});

export const quoteInputSchema = quoteDraftSchema.superRefine((value, context) => {
  if (value.products.includes("PUBLIC") && value.publicPlan === undefined) {
    context.addIssue({
      code: "custom",
      path: ["publicPlan"],
      message: "请选择公众责任险方案",
    });
  }

  if (value.products.includes("FOOD") && value.foodPlan === undefined) {
    context.addIssue({
      code: "custom",
      path: ["foodPlan"],
      message: "请选择食品安全责任险方案",
    });
  }

  if (value.products.includes("EMPLOYERS") && value.employerPlan === undefined) {
    context.addIssue({
      code: "custom",
      path: ["employerPlan"],
      message: "请选择雇主责任险档位",
    });
  }
});

export type QuoteInputValues = z.infer<typeof quoteInputSchema>;
