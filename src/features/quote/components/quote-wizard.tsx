"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quoteRules } from "@/config/quote-rules";
import { siteConfig } from "@/config/site";
import { calculateQuote } from "@/features/quote/calculator/calculate-quote";
import { calculateQuotePreview, type QuotePreview } from "@/features/quote/calculator/quote-preview";
import type { Product, QuoteInput, QuoteResult, QuoteStep } from "@/features/quote/types";
import { quoteInputSchema } from "@/features/quote/schemas/quote-input-schema";
import { getCompletedProgress, getQuoteSteps } from "@/features/quote/state/quote-step-flow";
import { loadQuoteDraft, saveQuoteDraft } from "@/features/quote/state/quote-draft-storage";
import { BottomBar, ProgressHeader, formatCurrency } from "./ui";
import { StoreStep } from "./steps/store-step";
import { EmployerPlanStep } from "./steps/employer-plan-step";
import { EmployeesStep } from "./steps/employees-step";
import { LiabilityPlansStep } from "./steps/liability-plans-step";
import { ResultStep } from "./steps/result-step";
import { useSoftKeyboard } from "../hooks/use-soft-keyboard";

const defaults: QuoteInput = {
  products: [],
  area: Number.NaN,
  employeeCounts: { BACK_OFFICE_OR_CASHIER: 0, WAITER: 0, CHEF_OR_CLEANER: 0 },
  allEmployeesAgeEligible: true,
};

const stepMeta: Record<QuoteStep, { title: string }> = {
  STORE: { title: "保费智能报价" },
  EMPLOYER_PLAN: { title: "选择雇主险档位" },
  EMPLOYEES: { title: "填写员工人数" },
  LIABILITY_PLANS: { title: "选择保障方案" },
  RESULT: { title: "报价结果" },
};

function getBottomSummary(
  step: QuoteStep,
  products: Product[],
  preview: QuotePreview,
): { label: string; value: string; isMoney: boolean } {
  if (step === "STORE") {
    return { label: `已选 ${products.length} 个险种`, value: "继续选择保障方案", isMoney: false };
  }

  if (step === "EMPLOYER_PLAN") {
    return { label: "雇主责任险", value: "请选择保障档位", isMoney: false };
  }

  if (step === "EMPLOYEES" && (preview.employerPeopleShortfall ?? 0) > 0) {
    return {
      label: "雇主责任险",
      value: `还差 ${preview.employerPeopleShortfall} 人达到起保要求`,
      isMoney: false,
    };
  }

  if (step === "EMPLOYEES") {
    return {
      label: "雇主险当前预估",
      value: formatCurrency(preview.knownSubtotal),
      isMoney: true,
    };
  }

  if (preview.manualQuoteCount > 0 && preview.knownSubtotal !== null) {
    return {
      label: "已知保费小计",
      value: `${formatCurrency(preview.knownSubtotal)} + ${preview.manualQuoteCount} 项待确认`,
      isMoney: false,
    };
  }

  if (preview.manualQuoteCount > 0) {
    return { label: "当前报价", value: `${preview.manualQuoteCount} 项需人工确认`, isMoney: false };
  }

  return {
    label: preview.missingProductCount === 0 ? "预估合计" : "当前已选保费",
    value: preview.knownSubtotal === null ? "继续选择方案" : formatCurrency(preview.knownSubtotal),
    isMoney: preview.knownSubtotal !== null,
  };
}

export function QuoteWizard() {
  const isSoftKeyboardOpen = useSoftKeyboard();
  const methods = useForm<QuoteInput>({ resolver: zodResolver(quoteInputSchema), defaultValues: defaults, mode: "onSubmit" });
  const { reset, setError, clearErrors, setFocus, getValues } = methods;
  const values = useWatch({ control: methods.control }) as QuoteInput;
  const products = values.products ?? [];
  const steps = getQuoteSteps(products);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [errorSummary, setErrorSummary] = useState("");

  useEffect(() => {
    const draft = loadQuoteDraft();
    if (draft) reset(draft);
    // This flag gates session persistence after the browser-only draft restore.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, [reset]);

  useLayoutEffect(() => {
    if (!hydrated) return;
    const current = getValues();
    const counts = current.employeeCounts;
    if (Number.isFinite(current.area) && current.area > 0 && current.products.length > 0 && Object.values(counts).every((value) => Number.isInteger(value) && value >= 0)) saveQuoteDraft(current);
  }, [hydrated, values, getValues]);

  const visibleStepIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[visibleStepIndex] ?? "STORE";
  const currentMeta = stepMeta[currentStep];
  const total = steps.length;
  const completedProgress = getCompletedProgress(visibleStepIndex, total);
  const preview = useMemo(() => calculateQuotePreview(values, quoteRules), [values]);
  const bottomSummary = getBottomSummary(currentStep, products, preview);

  function next() {
    setErrorSummary("");
    clearErrors();
    if (!validateStep(currentStep)) return;
    if (currentStep === "LIABILITY_PLANS" || (products.length > 0 && steps[visibleStepIndex + 1] === "RESULT")) {
      const parsed = quoteInputSchema.safeParse(getValues());
      if (!parsed.success) { setErrorSummary("请先补充所有必填信息"); return; }
      setResult(calculateQuote(parsed.data as QuoteInput, quoteRules));
      setStepIndex(steps.length - 1);
      return;
    }
    setStepIndex((index) => Math.min(Math.max(index, visibleStepIndex) + 1, steps.length - 1));
  }

  function validateStep(step: QuoteStep) {
    const current = getValues();
    const issues: string[] = [];
    if (step === "STORE") {
      if (!Number.isFinite(current.area) || current.area <= 0) { setError("area", { type: "manual", message: "请输入经营面积" }); issues.push("经营面积"); }
      if (!current.products.length) { setError("products", { type: "manual", message: "请选择险种" }); issues.push("险种"); }
      if (issues.length) {
        setErrorSummary(`请完善：${issues.join("、")}`);
        if (!Number.isFinite(current.area) || current.area <= 0) {
          setFocus("area");
        } else {
          requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[name="products"]')?.focus());
        }
        return false;
      }
    }
    if (step === "EMPLOYER_PLAN" && !current.employerPlan) { setError("employerPlan", { type: "manual", message: "请选择雇主责任险档位" }); setErrorSummary("请选择雇主责任险档位"); return false; }
    if (step === "EMPLOYEES") {
      const badRole = Object.entries(current.employeeCounts).find(([, value]) => !Number.isInteger(value) || value < 0);
      if (badRole) { setErrorSummary("请填写各岗位人数（0 或以上整数）"); setFocus(`employeeCounts.${badRole[0] as keyof QuoteInput["employeeCounts"]}`); return false; }
    }
    if (step === "LIABILITY_PLANS") {
      if (current.products.includes("PUBLIC") && !current.publicPlan) { setError("publicPlan", { type: "manual", message: "请选择公众责任险方案" }); issues.push("公众责任险方案"); }
      if (current.products.includes("FOOD") && !current.foodPlan) { setError("foodPlan", { type: "manual", message: "请选择食品安全责任险方案" }); issues.push("食品安全责任险方案"); }
      if (issues.length) { setErrorSummary(`请完善：${issues.join("、")}`); return false; }
    }
    return true;
  }

  function restart() { setResult(null); setStepIndex(0); setErrorSummary(""); clearErrors(); }
  function back() { setErrorSummary(""); clearErrors(); setStepIndex(Math.max(0, visibleStepIndex - 1)); }

  const body = currentStep === "STORE" ? <StoreStep /> : currentStep === "EMPLOYER_PLAN" ? <EmployerPlanStep /> : currentStep === "EMPLOYEES" ? <EmployeesStep /> : currentStep === "LIABILITY_PLANS" ? <LiabilityPlansStep /> : result ? <ResultStep result={result} input={getValues()} onRestart={restart} /> : null;
  if (!hydrated) return <main className="quote-app" aria-busy="true">
    <ProgressHeader {...stepMeta.STORE} current={1} total={2} value={0} />
    <div className="step-content" role="status">正在恢复当前会话…</div>
  </main>;
  if (currentStep === "RESULT" && !result) return null;
  return <FormProvider {...methods}><main className="quote-app" data-soft-keyboard={isSoftKeyboardOpen ? "open" : "closed"}>
    <ProgressHeader {...currentMeta} current={visibleStepIndex + 1} total={total} value={completedProgress} />
    {errorSummary ? <div className="error-summary" role="alert">{errorSummary}</div> : null}
    {body}
    <p className="quote-disclaimer">{siteConfig.disclaimer}</p>
    {currentStep !== "RESULT" ? <BottomBar onBack={visibleStepIndex > 0 ? back : undefined} onNext={next} nextLabel={currentStep === "LIABILITY_PLANS" || (products.length > 0 && steps[visibleStepIndex + 1] === "RESULT") ? "查看报价" : "下一步"} summary={<><span>{bottomSummary.label}</span><strong>{bottomSummary.value}{bottomSummary.isMoney ? <small> / 年</small> : null}</strong></>} hidden={isSoftKeyboardOpen} /> : null}
    {currentStep === "RESULT" && result ? <div className="result-footer-space" /> : null}
  </main></FormProvider>;
}
