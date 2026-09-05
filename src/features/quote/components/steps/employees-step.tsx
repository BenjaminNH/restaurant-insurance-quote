import { useFormContext, useWatch } from "react-hook-form";
import { CheckCircle, Info } from "@phosphor-icons/react";
import { employerRoleCopy, employerPlanCopy } from "@/config/site";
import { quoteRules } from "@/config/quote-rules";
import type { EmployerPlan, EmployerRole, QuoteInput } from "@/features/quote/types";
import { FieldError, SectionCard } from "../ui";
import { EmployeeCountInput } from "../employee-count-input";

const roles: EmployerRole[] = ["BACK_OFFICE_OR_CASHIER", "WAITER", "CHEF_OR_CLEANER"];

export function EmployeesStep() {
  const { setValue, formState: { errors } } = useFormContext<QuoteInput>();
  const plan = useWatch<QuoteInput>({ name: "employerPlan" }) as EmployerPlan | undefined;
  const counts = useWatch<QuoteInput>({ name: "employeeCounts" }) as Record<EmployerRole, number>;
  const ageEligible = useWatch<QuoteInput>({ name: "allEmployeesAgeEligible" });
  const rates = plan ? quoteRules.employers_liability.plans[plan].annual_rate_by_role : null;
  const total = roles.reduce((sum, role) => sum + (Number(counts?.[role]) || 0), 0);
  return (
    <div className="step-content">
      <p className="step-intro">雇主责任险 · {plan ? employerPlanCopy[plan] : "请选择档位"}：按岗位逐条录入人数，费率已含附加险。</p>
      <SectionCard>
        <div className="card-heading"><h2>按岗位录入人数</h2><span className="muted">年龄限 16–65 岁</span></div>
        <div className="employee-list">
          {roles.map((role) => (
            <EmployeeCountInput
              key={role}
              role={role}
              label={employerRoleCopy[role].label}
              rate={rates?.[role]}
            />
          ))}
        </div>
        <fieldset className="age-fieldset">
          <legend>员工年龄范围确认</legend>
          <label className={`inline-choice ${ageEligible === true ? "selected" : ""}`}><input type="radio" value="yes" aria-label="是，全部符合" checked={ageEligible === true} onChange={() => setValue("allEmployeesAgeEligible", true, { shouldDirty: true })} /><span className="radio-mark" aria-hidden="true" />是，全部符合</label>
          <label className={`inline-choice ${ageEligible === false ? "selected" : ""}`}><input type="radio" value="no" aria-label="否，存在范围外员工" checked={ageEligible === false} onChange={() => setValue("allEmployeesAgeEligible", false, { shouldDirty: true })} /><span className="radio-mark" aria-hidden="true" />否，存在范围外员工</label>
        </fieldset>
        {errors.allEmployeesAgeEligible ? <FieldError>{String(errors.allEmployeesAgeEligible.message)}</FieldError> : null}
      </SectionCard>
      <div className={`condition-note ${total >= 8 && ageEligible !== false ? "positive" : "warning"}`}>
        <strong>{total >= 8 ? <CheckCircle aria-hidden="true" /> : <Info aria-hidden="true" />}共 {total} 人，{total >= 8 ? "满足最低 8 人的承保要求" : "少于 8 人，不符合承保要求"}</strong>
        <span><Info aria-hidden="true" />{ageEligible === false ? "存在年龄范围外员工，雇主责任险需人工报价" : "员工年龄须在 16–65 岁范围内"}</span>
      </div>
    </div>
  );
}
