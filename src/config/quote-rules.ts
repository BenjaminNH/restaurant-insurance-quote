import rawRules from "../../docs/餐饮保险报价器-MVP规则.json";
import { quoteRulesSchema } from "@/features/quote/schemas/quote-rules-schema";

export const quoteRules = quoteRulesSchema.parse(rawRules);
