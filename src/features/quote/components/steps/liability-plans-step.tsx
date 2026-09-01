import { useFormContext, useWatch } from "react-hook-form";
import { foodPlanCopy, publicPlanCopy } from "@/config/site";
import { quoteRules } from "@/config/quote-rules";
import type { FoodPlan, PublicPlan, QuoteInput } from "@/features/quote/types";
import { FieldError, SectionCard, formatCurrency } from "../ui";

const publicPlans: PublicPlan[] = ["P1", "P2", "P3", "P4"];
const foodPlans: FoodPlan[] = ["P1", "P2", "P3"];

export function LiabilityPlansStep() {
  const { register, formState: { errors } } = useFormContext<QuoteInput>();
  const products = (useWatch<QuoteInput>({ name: "products" }) as QuoteInput["products"] | undefined) ?? [];
  const area = Number(useWatch<QuoteInput>({ name: "area" })) || 0;
  const selectedPublic = useWatch<QuoteInput>({ name: "publicPlan" });
  const selectedFood = useWatch<QuoteInput>({ name: "foodPlan" });
  return (
    <div className="step-content">
      <p className="step-intro">为公众责任险与食品安全责任险分别选择一档保障方案。</p>
      {products.includes("PUBLIC") ? <PlanGroup title="公众责任险" hint="按门店计费" error={errors.publicPlan?.message}>
        {publicPlans.map((plan) => <LiabilityPlanChoice key={plan} name="publicPlan" value={plan} label={publicPlanCopy[plan]} selected={selectedPublic === plan} premium={quoteRules.public_liability.plans[plan].base_premium_per_store} limits={`累计 ${quoteRules.public_liability.plans[plan].aggregate_limit_10k} 万 · 每次事故 ${quoteRules.public_liability.plans[plan].per_accident_limit_10k} 万`} register={register} />)}
      </PlanGroup> : null}
      {products.includes("FOOD") ? <PlanGroup title="食品安全责任险" hint="需食品经营许可证" error={errors.foodPlan?.message}>
        {foodPlans.map((plan) => <LiabilityPlanChoice key={plan} name="foodPlan" value={plan} label={foodPlanCopy[plan]} selected={selectedFood === plan} premium={quoteRules.food_liability.plans[plan].base_premium_per_store} limits={`累计 ${quoteRules.food_liability.plans[plan].aggregate_limit_10k} 万 · 每人 ${quoteRules.food_liability.plans[plan].per_person_limit_10k} 万`} register={register} />)}
      </PlanGroup> : null}
      <div className="info-note">按 {area || "实际"} ㎡匹配面积系数，保费按一年保险期间展示</div>
    </div>
  );
}

function PlanGroup({ title, hint, error, children }: { title: string; hint: string; error?: string; children: React.ReactNode }) {
  return <SectionCard><fieldset className="plan-fieldset" aria-label={title}><legend><span>{title}</span><small>{hint}</small></legend><div className="radio-list">{children}</div>{error ? <FieldError>{error}</FieldError> : null}</fieldset></SectionCard>;
}

function LiabilityPlanChoice({ name, value, label, selected, premium, limits, register }: { name: "publicPlan" | "foodPlan"; value: PublicPlan | FoodPlan; label: string; selected: boolean; premium: number; limits: string; register: ReturnType<typeof useFormContext<QuoteInput>>["register"] }) {
  return <label className={`plan-choice ${selected ? "selected" : ""}`}>
    <input type="radio" value={value} aria-label={label} {...register(name)} />
    <span className="radio-mark" aria-hidden="true" />
    <span className="choice-copy"><strong>{label} {value === "P2" && name === "publicPlan" ? <em>推荐</em> : null}</strong><span>{limits}</span></span>
    <span className="choice-price">{formatCurrency(premium)} <small>/ 店 / 年</small></span>
  </label>;
}
