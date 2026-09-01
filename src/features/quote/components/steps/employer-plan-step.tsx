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
      <p className="step-intro">雇主责任险独立选择、独立计算。档位决定每位员工的赔付上限，保费在下一步按岗位人数计算。</p>
      <SectionCard>
        <div className="card-heading"><h2>选择保障档位</h2><span className="muted">保额越高，单人事故赔付上限越高</span></div>
        <div className="radio-list" role="radiogroup" aria-label="雇主责任险档位">
          {plans.map((plan) => {
            const details = quoteRules.employers_liability.plans[plan];
            return <label className={`plan-choice ${selected === plan ? "selected" : ""}`} key={plan}>
              <input type="radio" value={plan} aria-label={employerPlanCopy[plan]} {...register("employerPlan")} />
              <span className="radio-mark" aria-hidden="true" />
              <span className="choice-copy"><strong>{employerPlanCopy[plan]} {plan === "UPGRADED" ? <em>推荐</em> : null}</strong><span>每人伤亡 {details.death_disability_limit_10k_per_person} 万 · 每人医疗 {details.medical_limit_10k_per_person} 万</span></span>
            </label>;
          })}
        </div>
        {errors.employerPlan ? <FieldError>{String(errors.employerPlan.message)}</FieldError> : null}
      </SectionCard>
      <div className="info-note">保费 = 各岗位人数 × 对应岗位费率，下一步按人数自动计算</div>
    </div>
  );
}
