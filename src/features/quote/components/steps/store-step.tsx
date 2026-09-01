import { useFormContext, useWatch, type UseFormRegister } from "react-hook-form";
import { productCopy, productOrder } from "@/config/site";
import type { Product, QuoteInput } from "@/features/quote/types";
import { saveQuoteDraft } from "@/features/quote/state/quote-draft-storage";
import { FieldError, SectionCard } from "../ui";

export function StoreStep() {
  const { register, getValues, formState: { errors } } = useFormContext<QuoteInput>();
  const area = useWatch<QuoteInput>({ name: "area" });
  const products = (useWatch<QuoteInput>({ name: "products" }) as Product[] | undefined) ?? [];
  return (
    <div className="step-content">
      <SectionCard>
        <div className="card-heading"><h2>① 餐饮门店信息</h2><span className="required-badge">必填</span></div>
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
        <FieldError>{errors.area?.message ?? (errors.products ? undefined : undefined)}</FieldError>
        <div className="info-note" id="area-help">ⓘ 当前档位 {typeof area === "number" && area >= 100 && area < 500 ? "100–500 ㎡，面积系数 ×1.8" : "按经营面积匹配系数"}；超过 3000 ㎡需人工报价</div>
      </SectionCard>
      <SectionCard>
        <div className="card-heading"><h2>② 选择险种 <small>（可多选）</small></h2></div>
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
          if (product === "EMPLOYERS") { setValue("employerPlan", undefined); setValue("allEmployeesAgeEligible", undefined); }
        }
      }} />
      <span className="checkmark" aria-hidden="true">✓</span>
      <span className="choice-copy"><strong>{copy.label}</strong><span>{copy.description}</span></span>
      <span className="choice-price">{copy.price}</span>
    </label>
  );
}
