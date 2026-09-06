import { useFormContext, useWatch, type UseFormRegister } from "react-hook-form";
import { Check } from "@phosphor-icons/react";
import { productCopy, productOrder } from "@/config/site";
import { quoteRules } from "@/config/quote-rules";
import { getLiabilityAreaOutcome } from "@/features/quote/calculator/liability-by-area";
import type { Product, QuoteInput } from "@/features/quote/types";
import { saveQuoteDraft } from "@/features/quote/state/quote-draft-storage";
import { FieldError, SectionCard } from "../ui";

export function StoreStep() {
  const { register, getValues, formState: { errors } } = useFormContext<QuoteInput>();
  const products = (useWatch<QuoteInput>({ name: "products" }) as Product[] | undefined) ?? [];
  const area = Number(useWatch<QuoteInput>({ name: "area" }));
  const publicOutcome = Number.isFinite(area) && area > 0
    ? getLiabilityAreaOutcome("PUBLIC", area, quoteRules)
    : null;
  const foodOutcome = Number.isFinite(area) && area > 0
    ? getLiabilityAreaOutcome("FOOD", area, quoteRules)
    : null;
  const areaHelp = !publicOutcome || !foodOutcome
    ? "输入经营面积后显示适用系数"
    : publicOutcome.status === "FACTOR" && foodOutcome.status === "FACTOR"
      ? `当前系数：公众险 ×${publicOutcome.factor}，食责险 ×${foodOutcome.factor}`
      : `当前系数：公众险${publicOutcome.status === "FACTOR" ? ` ×${publicOutcome.factor}` : "需人工报价"}；食责险${foodOutcome.status === "FACTOR" ? ` ×${foodOutcome.factor}` : "需人工报价"}`;
  return (
    <div className="step-content">
      <SectionCard>
        <div className="card-heading"><h2>门店信息</h2><span className="required-badge">必填</span></div>
        <div className="area-row">
          <label htmlFor="area">经营面积</label>
          <div className="input-with-unit">
            <input id="area" aria-describedby="area-help area-error" inputMode="decimal" type="number" step="any" min="0" placeholder="请输入" {...register("area", { valueAsNumber: true, onChange: (event) => {
              const areaValue = Number(event.target.value);
              const current = getValues();
              if (areaValue > 0 && current.products.length > 0) saveQuoteDraft({ ...current, area: areaValue });
            } })} />
            <span>㎡</span>
          </div>
        </div>
        <FieldError id="area-error">{errors.area?.message ?? (errors.products ? undefined : undefined)}</FieldError>
        <div className="info-note area-factor-note" id="area-help">{areaHelp}</div>
      </SectionCard>
      <SectionCard>
        <div className="card-heading"><h2>选择险种 <small>（可多选）</small></h2></div>
        <div className="product-list" role="group" aria-label="险种选择">
          {productOrder.map((product) => <ProductChoice key={product} product={product} checked={products.includes(product)} register={register} />)}
        </div>
        {errors.products ? <FieldError>请选择至少一个险种</FieldError> : null}
      </SectionCard>
    </div>
  );
}

function ProductChoice({ product, checked, register }: { product: Product; checked: boolean; register: UseFormRegister<QuoteInput> }) {
  const { setValue, getValues } = useFormContext<QuoteInput>();
  const currentProducts = (useWatch<QuoteInput>({ name: "products" }) as Product[] | undefined) ?? [];
  const copy = productCopy[product];
  return (
    <label className={`product-choice ${checked ? "selected" : ""}`}>
      <input type="checkbox" aria-label={copy.label} value={product} checked={checked} {...register("products")} onChange={(event) => {
        const next = event.target.checked ? [...currentProducts, product] : currentProducts.filter((item) => item !== product);
        setValue("products", productOrder.filter((item) => next.includes(item)), { shouldDirty: true });
        const current = getValues();
        if (Number.isFinite(current.area) && current.area > 0 && next.length > 0) saveQuoteDraft({ ...current, products: productOrder.filter((item) => next.includes(item)) });
        if (!event.target.checked) {
          if (product === "PUBLIC") setValue("publicPlan", undefined);
          if (product === "FOOD") setValue("foodPlan", undefined);
          if (product === "EMPLOYERS") { setValue("employerPlan", undefined); setValue("allEmployeesAgeEligible", true); }
        }
      }} />
      <span className="checkmark" aria-hidden="true">{checked ? <Check weight="bold" /> : null}</span>
      <span className="choice-copy"><strong>{copy.label}</strong><span>{copy.description}</span></span>
      <span className="choice-price">{copy.price}</span>
    </label>
  );
}
