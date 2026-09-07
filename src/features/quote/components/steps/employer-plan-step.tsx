import { useFormContext, useWatch } from "react-hook-form";
import { employerPlanCopy } from "@/config/site";
import { quoteRules } from "@/config/quote-rules";
import type { EmployerPlan, QuoteInput } from "@/features/quote/types";
import { FieldError, SectionCard } from "../ui";

const plans: EmployerPlan[] = ["BASIC", "UPGRADED", "PREMIUM", "ULTIMATE"];

export function EmployerPlanStep() {
  const { register, formState: { errors } } = useFormContext<QuoteInput>();
  const selected = useWatch<QuoteInput>({ name: "employerPlan" });
  return (
    <div className="step-content">
      <p className="step-intro">选择每位员工的保障额度。</p>
      <SectionCard>
        <div className="card-heading"><h2>选择保障档位</h2></div>
        <div className="radio-list" role="radiogroup" aria-label="雇主责任险档位">
          {plans.map((plan) => {
            const details = quoteRules.employers_liability.plans[plan];
            return <label className={`plan-choice ${selected === plan ? "selected" : ""}`} key={plan}>
              <input type="radio" value={plan} aria-label={employerPlanCopy[plan]} {...register("employerPlan")} />
              <span className="radio-mark" aria-hidden="true" />
              <span className="choice-copy"><strong>{employerPlanCopy[plan]}</strong><span>每人伤亡 {details.death_disability_limit_10k_per_person} 万 · 每人医疗 {details.medical_limit_10k_per_person} 万</span></span>
            </label>;
          })}
        </div>
        {errors.employerPlan ? <FieldError>{String(errors.employerPlan.message)}</FieldError> : null}
      </SectionCard>
    </div>
  );
}
