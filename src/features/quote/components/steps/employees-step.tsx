import { useWatch } from "react-hook-form";
import { CheckCircle, Info, WarningCircle } from "@phosphor-icons/react";
import { employerRoleCopy, employerPlanCopy } from "@/config/site";
import { quoteRules } from "@/config/quote-rules";
import type { EmployerPlan, EmployerRole, QuoteInput } from "@/features/quote/types";
import { SectionCard } from "../ui";
import { EmployeeCountInput } from "../employee-count-input";

const roles: EmployerRole[] = ["BACK_OFFICE_OR_CASHIER", "WAITER", "CHEF_OR_CLEANER"];

export function EmployeesStep() {
  const plan = useWatch<QuoteInput>({ name: "employerPlan" }) as EmployerPlan | undefined;
  const counts = useWatch<QuoteInput>({ name: "employeeCounts" }) as Record<EmployerRole, number>;
  const rates = plan ? quoteRules.employers_liability.plans[plan].annual_rate_by_role : null;
  const total = roles.reduce((sum, role) => sum + (Number(counts?.[role]) || 0), 0);
  const missingPeople = Math.max(0, quoteRules.employers_liability.minimum_people_per_policy - total);
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
      </SectionCard>
      <div className={`condition-note ${missingPeople > 0 ? "warning" : "positive"}`} data-status={missingPeople > 0 ? "warning" : "positive"}>
        <strong>
          {missingPeople > 0 ? <WarningCircle weight="fill" aria-hidden="true" /> : <CheckCircle weight="fill" aria-hidden="true" />}
          {missingPeople > 0
            ? `共 ${total} 人，还差 ${missingPeople} 人达到 8 人起保要求`
            : `共 ${total} 人，满足最低承保人数`}
        </strong>
        <span><Info aria-hidden="true" />投保员工须为 16–65 周岁，正式投保时核验。</span>
      </div>
    </div>
  );
}
