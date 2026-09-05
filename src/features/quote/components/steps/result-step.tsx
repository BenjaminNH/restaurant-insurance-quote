import { employerPlanCopy, foodPlanCopy, publicPlanCopy, siteConfig } from "@/config/site";
import { CheckCircle, FileText, Phone } from "@phosphor-icons/react";
import type { QuoteInput, QuoteItem, QuoteResult } from "@/features/quote/types";
import { SectionCard, formatCurrency } from "../ui";

const productLabels = { PUBLIC: "公众责任险", FOOD: "食品安全责任险", EMPLOYERS: "雇主责任险" } as const;

export function ResultStep({ result, input, onRestart }: { result: QuoteResult; input: QuoteInput; onRestart: () => void }) {
  const totalPeople = Object.values(input.employeeCounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const title = result.status === "NOT_ELIGIBLE" ? "不符合承保条件" : result.status === "MANUAL_QUOTE" ? "需人工报价" : result.status === "PARTIAL_MANUAL" ? "部分需人工确认" : "报价结果";
  return <div className="result-content">
    <div className={`result-hero ${result.status !== "QUOTED" ? "attention" : ""}`}>
      <span className="eyebrow">{result.status === "QUOTED" ? "年度预估合计" : title}</span>
      {result.status === "QUOTED" ? <div className="total-amount">{formatCurrency(result.totalPremium)} <small>/ 年</small></div> : <h2>{title}</h2>}
      <p>{input.products.length} 个险种 · 1 家门店（{input.area || "—"} ㎡）{input.products.includes("EMPLOYERS") ? ` · ${totalPeople} 名员工` : ""}</p>
      <p className="rule-version">规则版本：{result.ruleVersion}</p>
    </div>
    {result.status === "NOT_ELIGIBLE" ? <SectionCard className="status-card warning-card"><h2>雇主责任险暂不承保</h2><p>本单共 {totalPeople} 人，低于最低 8 人的承保要求。</p><strong>不转人工报价</strong></SectionCard> : null}
    {(result.status === "MANUAL_QUOTE" || result.status === "PARTIAL_MANUAL") ? <SectionCard className="status-card warning-card"><h2>{result.status === "PARTIAL_MANUAL" ? "部分项目需人工确认" : "超出自动报价范围"}</h2><p>{result.status === "PARTIAL_MANUAL" ? "已展示可计算项目的小计，最终总价待人工确认。" : "当前条件超出标准自动报价范围，销售顾问将协助确认。"}</p>{result.status === "PARTIAL_MANUAL" ? <strong>最终总价待人工确认</strong> : null}</SectionCard> : null}
    {result.status === "PARTIAL_MANUAL" ? <SectionCard><div className="result-subtotal"><span>已知保费小计</span><strong>{formatCurrency(result.knownSubtotal)}</strong></div></SectionCard> : null}
    {result.items.length ? <SectionCard><h2>保费明细</h2><div className="result-items">{result.items.map((item) => <ResultItem key={item.product} item={item} input={input} />)}</div></SectionCard> : null}
    {result.status === "QUOTED" ? <>
      <SectionCard><h2>保障与免赔要点</h2><ul className="detail-list"><li><CheckCircle aria-hidden="true" />公众 / 食责：免赔 100 元或损失金额 10%，两者取高</li><li><CheckCircle aria-hidden="true" />雇主医疗：免赔 200 元后按 90% 赔付</li><li><CheckCircle aria-hidden="true" />雇主误工：绝对免赔 3 天，单次 ≤90 天，累计 ≤180 天</li><li><CheckCircle aria-hidden="true" />雇主误工费标准：100 元 / 天</li></ul></SectionCard>
      <SectionCard><h2>承保所需资料</h2><ul className="detail-list"><li><FileText aria-hidden="true" />营业执照（副本）</li>{input.products.includes("FOOD") ? <li><FileText aria-hidden="true" />食品生产许可证（投食责险必需）</li> : null}{input.products.includes("EMPLOYERS") ? <li><FileText aria-hidden="true" />员工花名册（含岗位与出生日期）</li> : null}<li><FileText aria-hidden="true" />门店经营面积证明或租赁合同</li></ul></SectionCard>
    </> : null}
    <div className="sales-contact"><strong>{siteConfig.salesContact}</strong><span>可协助确认承保条件与正式方案</span><button type="button" className="contact-button"><Phone aria-hidden="true" />联系销售 · 确认方案</button></div>
    <button type="button" className="recalculate-button" onClick={onRestart}>修改条件，重新计算</button>
  </div>;
}

function ResultItem({ item, input }: { item: QuoteItem; input: QuoteInput }) {
  const plan = item.product === "PUBLIC" ? input.publicPlan : item.product === "FOOD" ? input.foodPlan : input.employerPlan;
  const planLabel = item.product === "PUBLIC" && plan ? publicPlanCopy[plan as keyof typeof publicPlanCopy] : item.product === "FOOD" && plan ? foodPlanCopy[plan as keyof typeof foodPlanCopy] : plan ? employerPlanCopy[plan as keyof typeof employerPlanCopy] : "";
  const reason = item.reasonCode === "AREA_LIMIT" ? "经营面积超出自动报价范围" : item.reasonCode === "AGE_RANGE" ? "员工年龄存在 16–65 周岁范围外情况" : item.reasonCode === "MINIMUM_PEOPLE" ? "总人数不足 8 人" : "";
  return <div className="result-item"><div><strong>{productLabels[item.product]} · {planLabel}</strong><span>{item.calculation ? item.calculation : reason}</span></div><strong>{formatCurrency(item.premium)}</strong></div>;
}
