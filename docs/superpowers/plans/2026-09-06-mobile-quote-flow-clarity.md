# 移动端报价流程信息层级优化实施计划

> **面向执行代理：** 必须逐项执行本计划，推荐使用 `superpowers:subagent-driven-development`，也可使用 `superpowers:executing-plans`。所有步骤使用复选框跟踪。

**目标：** 修正动态流程进度，压缩重复文案，提供准确的面积系数与人数准入反馈，并让底栏按已完成险种实时累计保费。

**架构：** 保留现有动态步骤和最终报价模块，新增独立的纯 TypeScript 渐进预览计算；进度、面积匹配和预览摘要由纯函数生成，React 组件只负责订阅表单值和渲染。年龄字段继续作为扩展位保留，但 MVP 前端默认合规且不再要求用户确认。

**技术栈：** Next.js 16 App Router、React 19、TypeScript、React Hook Form、Zod、Tailwind CSS 4、Vitest、Playwright。

---

## 文件结构与执行前置

- 新建 `src/features/quote/calculator/quote-preview.ts`：计算已知项目、小计、人工确认数量和雇主险人数缺口。
- 修改 `src/features/quote/calculator/liability-by-area.ts`：抽出面积档位匹配结果，供正式报价和动态提示共同使用。
- 修改 `src/features/quote/state/quote-step-flow.ts`：提供完成步骤进度纯函数。
- 修改 `src/features/quote/components/quote-wizard.tsx`：设置年龄默认值、消费预览结果并生成底栏摘要。
- 修改 `src/features/quote/components/ui.tsx`、四个步骤组件、结果组件和 `src/app/globals.css`。
- 修改现有 Vitest 与 Playwright 测试，不引入新框架。

执行代码前完整阅读：

- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`
- `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`
- `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`
- `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`

## 任务 1：修正顶部层级与进度语义

**文件：**

- 修改：`src/features/quote/state/quote-step-flow.ts`
- 修改：`src/features/quote/components/ui.tsx`
- 修改：`src/features/quote/components/quote-wizard.tsx`
- 修改：`src/app/globals.css`
- 测试：`tests/unit/quote-step-flow.test.ts`
- 测试：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写失败的进度单元测试**

```ts
import { getCompletedProgress } from "@/features/quote/state/quote-step-flow";

test.each([2, 3, 4, 5])("首屏在共 %s 步时完成度都是 0", (total) => {
  expect(getCompletedProgress(0, total)).toBe(0);
});

test("中间步骤按已完成步骤计算，结果页为 100", () => {
  expect(getCompletedProgress(1, 5)).toBe(25);
  expect(getCompletedProgress(2, 5)).toBe(50);
  expect(getCompletedProgress(4, 5)).toBe(100);
});
```

- [ ] **步骤 2：确认 RED**

运行：`npm test -- tests/unit/quote-step-flow.test.ts`

预期：失败，提示 `getCompletedProgress` 未导出。

- [ ] **步骤 3：实现最小纯函数**

```ts
export function getCompletedProgress(stepIndex: number, totalSteps: number) {
  if (totalSteps <= 1) return 100;
  const boundedIndex = Math.min(Math.max(stepIndex, 0), totalSteps - 1);
  return Math.round((boundedIndex / (totalSteps - 1)) * 100);
}
```

- [ ] **步骤 4：先写顶部 E2E 并确认 RED**

```ts
test("顶部标题与步骤同排且勾选险种不会使进度倒退", async ({ page }) => {
  await page.goto("/");
  const header = page.locator(".header-row");
  await expect(header.getByRole("heading", { name: "保费智能预估" })).toBeVisible();
  await expect(header.getByText("第 1 / 2 步", { exact: true })).toBeVisible();
  await expect(page.getByText("餐饮安心保", { exact: true })).toHaveCount(0);

  const progress = page.getByRole("progressbar", { name: "报价进度" });
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await chooseProducts(page, ["雇主责任险", "公众责任险", "食品安全责任险"]);
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await expect(header.getByText("第 1 / 5 步", { exact: true })).toBeVisible();
});
```

运行：`npm run test:e2e -- --grep "顶部标题与步骤同排" --project=chromium-mobile --workers=1`

预期：因旧品牌和 50% 进度失败。

- [ ] **步骤 5：简化头部并接入完成度**

将 `ProgressHeader` 改为：

```tsx
export function ProgressHeader({
  title,
  current,
  total,
  value,
}: {
  title: string;
  current: number;
  total: number;
  value: number;
}) {
  return (
    <header className="quote-header">
      <div className="header-row">
        <h1>{title}</h1>
        <span className="step-count">第 {current} / {total} 步</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="报价进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`第 ${current} 步，共 ${total} 步，已完成 ${value}%`}
      >
        <div className="progress-value" style={{ width: `${value}%` }} />
      </div>
    </header>
  );
}
```

在向导中使用 `getCompletedProgress(visibleStepIndex, total)`。标题依次为“保费智能预估”“选择雇主险档位”“填写员工人数”“选择保障方案”“报价结果”。删除品牌锁定区、栏目标签、百分比和相关 CSS；`.header-row h1` margin 设为 0。

- [ ] **步骤 6：确认 GREEN 并提交**

```bash
npm test -- tests/unit/quote-step-flow.test.ts
npm run test:e2e -- --grep "顶部标题与步骤同排" --project=chromium-mobile --workers=1
git add src/features/quote/state/quote-step-flow.ts src/features/quote/components/ui.tsx src/features/quote/components/quote-wizard.tsx src/app/globals.css tests/unit/quote-step-flow.test.ts tests/e2e/quote-flow.spec.ts
git commit -m "fix: make quote progress monotonic"
```

## 任务 2：复用规则生成动态面积系数提示

**文件：**

- 修改：`src/features/quote/calculator/liability-by-area.ts`
- 修改：`src/features/quote/components/steps/store-step.tsx`
- 修改：`src/features/quote/components/ui.tsx`
- 修改：`src/app/globals.css`
- 测试：`tests/unit/calculator.test.ts`
- 测试：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写面积匹配失败测试**

```ts
import { getLiabilityAreaOutcome } from "@/features/quote/calculator/liability-by-area";

test("面积匹配结果可供界面显示系数", () => {
  expect(getLiabilityAreaOutcome("PUBLIC", 260, quoteRules))
    .toEqual({ status: "FACTOR", factor: 1.8 });
  expect(getLiabilityAreaOutcome("FOOD", 260, quoteRules))
    .toEqual({ status: "FACTOR", factor: 1.5 });
});

test("超出面积时返回人工报价状态", () => {
  expect(getLiabilityAreaOutcome("FOOD", 2500, quoteRules))
    .toEqual({ status: "MANUAL_QUOTE" });
});
```

运行：`npm test -- tests/unit/calculator.test.ts`

预期：失败，提示新函数不存在。

- [ ] **步骤 2：抽出面积匹配并复用**

```ts
export type LiabilityAreaOutcome =
  | { status: "FACTOR"; factor: number }
  | { status: "MANUAL_QUOTE" };

export function getLiabilityAreaOutcome(
  product: LiabilityProduct,
  area: number,
  rules: QuoteRules,
): LiabilityAreaOutcome {
  const section = product === "PUBLIC" ? rules.public_liability : rules.food_liability;
  const band = section.area_bands.find((candidate) => {
    const aboveMin = "min_exclusive" in candidate
      ? area > candidate.min_exclusive
      : area >= candidate.min_inclusive;
    return aboveMin && (candidate.max_exclusive === null || area < candidate.max_exclusive);
  });

  if (!band || "result" in band) return { status: "MANUAL_QUOTE" };
  return { status: "FACTOR", factor: band.factor };
}
```

让 `calculateLiabilityByArea` 调用该函数，避免复制面积边界。

- [ ] **步骤 3：先写动态提示 E2E 并确认 RED**

```ts
test("经营面积只显示当前匹配系数并与输入框保持间距", async ({ page }) => {
  await page.goto("/");
  const note = page.locator("#area-help");
  await expect(note).toHaveText("输入经营面积后显示适用系数");
  await page.getByLabel("经营面积").fill("260");
  await expect(note).toHaveText("当前系数：公众险 ×1.8，食责险 ×1.5");
  await page.getByLabel("经营面积").fill("2500");
  await expect(note).toHaveText("当前系数：公众险 ×3.5；食责险需人工报价");

  const gap = await page.evaluate(() => {
    const input = document.querySelector(".input-with-unit")!.getBoundingClientRect();
    const help = document.querySelector("#area-help")!.getBoundingClientRect();
    return help.top - input.bottom;
  });
  expect(gap).toBeGreaterThanOrEqual(12);
});
```

运行：`npm run test:e2e -- --grep "经营面积只显示当前匹配系数" --project=chromium-mobile --workers=1`

预期：旧笼统提示导致失败。

- [ ] **步骤 4：渲染动态结果**

```tsx
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
    : `当前系数：公众险 ${publicOutcome.status === "FACTOR" ? `×${publicOutcome.factor}` : "需人工报价"}；食责险 ${foodOutcome.status === "FACTOR" ? `×${foodOutcome.factor}` : "需人工报价"}`;
```

提示元素使用 `className="info-note area-factor-note"`。为字段错误增加 `id="area-error"`，并设置 `.area-factor-note { margin-top: 0.75rem; }`。

- [ ] **步骤 5：确认 GREEN 并提交**

```bash
npm test -- tests/unit/calculator.test.ts
npm run test:e2e -- --grep "经营面积只显示当前匹配系数" --project=chromium-mobile --workers=1
git add src/features/quote/calculator/liability-by-area.ts src/features/quote/components/steps/store-step.tsx src/features/quote/components/ui.tsx src/app/globals.css tests/unit/calculator.test.ts tests/e2e/quote-flow.spec.ts
git commit -m "feat: show matched area factors"
```

## 任务 3：移除年龄确认并修正人数准入状态

**文件：**

- 修改：`src/features/quote/schemas/quote-input-schema.ts`
- 修改：`src/features/quote/components/quote-wizard.tsx`
- 修改：`src/features/quote/components/steps/employees-step.tsx`
- 修改：`src/app/globals.css`
- 测试：`tests/unit/quote-input-schema.test.ts`
- 测试：`tests/unit/draft-storage.test.ts`
- 测试：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写默认年龄合规失败测试**

```ts
test("雇主险未传年龄确认时默认符合年龄范围", () => {
  const parsed = quoteInputSchema.parse({
    products: ["EMPLOYERS"],
    area: 260,
    employerPlan: "UPGRADED",
    employeeCounts: {
      BACK_OFFICE_OR_CASHIER: 0,
      WAITER: 8,
      CHEF_OR_CLEANER: 0,
    },
  });
  expect(parsed.allEmployeesAgeEligible).toBe(true);
});
```

在 `draft-storage.test.ts` 增加：

```ts
test("旧草稿没有年龄字段时恢复为默认合规", () => {
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      draftVersion: 1,
      ruleVersion: "mvp-1.1",
      savedAt: new Date().toISOString(),
      values: {
        products: ["EMPLOYERS"],
        area: 260,
        employerPlan: "UPGRADED",
        employeeCounts: {
          BACK_OFFICE_OR_CASHIER: 0,
          WAITER: 8,
          CHEF_OR_CLEANER: 0,
        },
      },
    }),
  );

  expect(loadQuoteDraft()?.allEmployeesAgeEligible).toBe(true);
});
```

运行：`npm test -- tests/unit/quote-input-schema.test.ts tests/unit/draft-storage.test.ts`

预期：完整 schema 报“请确认员工年龄范围”。

- [ ] **步骤 2：实现年龄默认值**

将字段改为：

```ts
allEmployeesAgeEligible: z.boolean().optional().default(true),
```

删除完整 schema 中针对 `allEmployeesAgeEligible === undefined` 的 issue；向导默认值增加 `allEmployeesAgeEligible: true`，并删除员工步骤的年龄必填校验。保留类型字段和年龄异常计算单元测试。

- [ ] **步骤 3：先写员工状态 E2E 并确认 RED**

```ts
test("员工页不要求年龄确认并正确区分起保状态", async ({ page }) => {
  await openEmployeeStep(page);
  await expect(page.getByLabel("是，全部符合")).toHaveCount(0);
  await expect(page.getByLabel("否，存在范围外员工")).toHaveCount(0);
  await expect(page.getByText("投保员工须为 16–65 周岁，正式投保时核验。")).toBeVisible();

  const note = page.locator(".condition-note");
  await page.getByRole("spinbutton", { name: "服务员人数" }).fill("7");
  await expect(note).toHaveAttribute("data-status", "warning");
  await expect(note).toContainText("还差 1 人达到 8 人起保要求");
  await page.getByRole("spinbutton", { name: "服务员人数" }).fill("8");
  await expect(note).toHaveAttribute("data-status", "positive");
  await expect(note).toContainText("满足最低承保人数");
});
```

运行：`npm run test:e2e -- --grep "员工页不要求年龄确认" --project=chromium-mobile --workers=1`

预期：旧 radio 和旧状态使测试失败。

- [ ] **步骤 4：重写员工状态**

删除年龄 fieldset。使用：

```tsx
const missingPeople = Math.max(0, 8 - total);

<div
  className={`condition-note ${missingPeople > 0 ? "warning" : "positive"}`}
  data-status={missingPeople > 0 ? "warning" : "positive"}
>
  <strong>
    {missingPeople > 0
      ? <WarningCircle weight="fill" aria-hidden="true" />
      : <CheckCircle weight="fill" aria-hidden="true" />}
    {missingPeople > 0
      ? `共 ${total} 人，还差 ${missingPeople} 人达到 8 人起保要求`
      : `共 ${total} 人，满足最低承保人数`}
  </strong>
  <span><Info aria-hidden="true" />投保员工须为 16–65 周岁，正式投保时核验。</span>
</div>
```

警告使用 `var(--color-error)` 和 `var(--color-error-soft)`；成功使用绿色图标和浅绿色背景。删除年龄按钮专用 CSS。

- [ ] **步骤 5：更新既有流程测试并确认 GREEN**

删除所有 UI 流程中的年龄 radio 操作；删除“年龄范围存在例外时转人工报价”E2E，但保留计算器年龄异常单元测试。

```bash
npm test -- tests/unit/quote-input-schema.test.ts tests/unit/draft-storage.test.ts tests/unit/calculator.test.ts
npm run test:e2e -- --grep "员工页不要求年龄确认|少于 8 人|三险正常路径" --project=chromium-mobile --workers=1
git add src/features/quote/schemas/quote-input-schema.ts src/features/quote/components/quote-wizard.tsx src/features/quote/components/steps/employees-step.tsx src/app/globals.css tests/unit/quote-input-schema.test.ts tests/unit/draft-storage.test.ts tests/e2e/quote-flow.spec.ts
git commit -m "fix: simplify employee eligibility input"
```

## 任务 4：新增渐进报价预览并驱动底栏

**文件：**

- 新建：`src/features/quote/calculator/quote-preview.ts`
- 修改：`src/features/quote/components/quote-wizard.tsx`
- 测试：`tests/unit/calculator.test.ts`
- 测试：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写渐进预览失败测试**

```ts
import { calculateQuotePreview } from "@/features/quote/calculator/quote-preview";

test("雇主险达到 8 人后立即产生预览金额", () => {
  const preview = calculateQuotePreview({
    products: ["EMPLOYERS", "PUBLIC", "FOOD"],
    area: 260,
    employerPlan: "UPGRADED",
    employeeCounts: {
      BACK_OFFICE_OR_CASHIER: 0,
      WAITER: 8,
      CHEF_OR_CLEANER: 0,
    },
    allEmployeesAgeEligible: true,
  }, quoteRules);

  expect(preview.knownSubtotal).toBe(864);
  expect(preview.items).toHaveLength(1);
  expect(preview.missingProductCount).toBe(2);
  expect(preview.employerPeopleShortfall).toBe(0);
});

test("雇主险不足 8 人时不输出预览金额", () => {
  const preview = calculateQuotePreview({
    products: ["EMPLOYERS"],
    area: 260,
    employerPlan: "UPGRADED",
    employeeCounts: {
      BACK_OFFICE_OR_CASHIER: 0,
      WAITER: 7,
      CHEF_OR_CLEANER: 0,
    },
    allEmployeesAgeEligible: true,
  }, quoteRules);

  expect(preview.knownSubtotal).toBeNull();
  expect(preview.employerPeopleShortfall).toBe(1);
});
```

同时添加人工报价累计测试：

```ts
test("已知项目累计金额并记录人工确认项", () => {
  const preview = calculateQuotePreview({
    products: ["EMPLOYERS", "PUBLIC", "FOOD"],
    area: 2500,
    employerPlan: "UPGRADED",
    publicPlan: "P1",
    foodPlan: "P1",
    employeeCounts: {
      BACK_OFFICE_OR_CASHIER: 0,
      WAITER: 8,
      CHEF_OR_CLEANER: 0,
    },
    allEmployeesAgeEligible: true,
  }, quoteRules);

  expect(preview.knownSubtotal).toBe(2964);
  expect(preview.manualQuoteCount).toBe(1);
  expect(preview.missingProductCount).toBe(0);
});
```

运行：`npm test -- tests/unit/calculator.test.ts`

预期：模块不存在导致失败。

- [ ] **步骤 2：实现纯预览模块**

```ts
export type QuotePreview = {
  items: QuoteItem[];
  knownSubtotal: number | null;
  manualQuoteCount: number;
  missingProductCount: number;
  employerPeopleShortfall: number | null;
};

export function calculateQuotePreview(input: QuoteInput, rules: QuoteRules): QuotePreview {
  const items: QuoteItem[] = [];
  const counts = input.employeeCounts;
  const validCounts = Object.values(counts).every(
    (value) => Number.isInteger(value) && value >= 0,
  );
  const totalPeople = validCounts
    ? Object.values(counts).reduce((sum, value) => sum + value, 0)
    : 0;
  const minimum = rules.employers_liability.minimum_people_per_policy;
  const employerPeopleShortfall = input.products.includes("EMPLOYERS")
    ? Math.max(0, minimum - totalPeople)
    : null;

  if (input.products.includes("EMPLOYERS") && input.employerPlan && validCounts && totalPeople >= minimum) {
    items.push(calculateEmployersLiability(input.employerPlan, counts, true, rules));
  }
  if (input.products.includes("PUBLIC") && input.publicPlan && input.area > 0) {
    items.push(calculateLiabilityByArea("PUBLIC", input.publicPlan, input.area, rules));
  }
  if (input.products.includes("FOOD") && input.foodPlan && input.area > 0) {
    items.push(calculateLiabilityByArea("FOOD", input.foodPlan, input.area, rules));
  }

  const quoted = items.filter((item) => item.status === "QUOTED");
  return {
    items,
    knownSubtotal: quoted.length
      ? quoted.reduce((sum, item) => sum + (item.premium ?? 0), 0)
      : null,
    manualQuoteCount: items.filter((item) => item.status === "MANUAL_QUOTE").length,
    missingProductCount: input.products.length - items.length,
    employerPeopleShortfall,
  };
}
```

导入现有 `QuoteRules`、`QuoteInput`、`QuoteItem` 和三个纯计算函数。

- [ ] **步骤 3：先写底栏 E2E 并确认 RED**

```ts
test("员工和方案选择阶段逐步累计底栏金额", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await chooseProducts(page, ["雇主责任险", "公众责任险", "食品安全责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("升级版").check();
  await page.getByRole("button", { name: "下一步" }).click();

  const summary = page.locator(".bottom-summary");
  await page.getByRole("spinbutton", { name: "服务员人数" }).fill("8");
  await expect(summary).toContainText("雇主险当前预估");
  await expect(summary).toContainText("¥864");

  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P2").check();
  await expect(summary).toContainText("¥2,304");
  await page.getByLabel("食品安全责任险方案一").check();
  await expect(summary).toContainText("¥3,504");
  await expect(summary).toContainText("预估合计");
});
```

运行：`npm run test:e2e -- --grep "逐步累计底栏金额" --project=chromium-mobile --workers=1`

预期：当前“待完善”导致失败。

- [ ] **步骤 4：在向导中消费预览**

用 `useMemo` 调用 `calculateQuotePreview(values, quoteRules)`，删除完整 schema 驱动的 `previewTotal`。新增纯摘要函数：

```ts
function getBottomSummary(step: QuoteStep, products: Product[], preview: QuotePreview) {
  if (step === "STORE") {
    return { label: `已选 ${products.length} 个险种`, value: "继续选择保障方案" };
  }
  if (step === "EMPLOYER_PLAN") {
    return { label: "雇主责任险", value: "请选择保障档位" };
  }
  if (step === "EMPLOYEES" && (preview.employerPeopleShortfall ?? 0) > 0) {
    return {
      label: "雇主责任险",
      value: `还差 ${preview.employerPeopleShortfall} 人达到起保要求`,
    };
  }
  if (step === "EMPLOYEES") {
    return { label: "雇主险当前预估", value: formatCurrency(preview.knownSubtotal) };
  }
  if (preview.manualQuoteCount > 0 && preview.knownSubtotal !== null) {
    return {
      label: "已知保费小计",
      value: `${formatCurrency(preview.knownSubtotal)} + ${preview.manualQuoteCount} 项待确认`,
    };
  }
  if (preview.manualQuoteCount > 0) {
    return { label: "当前报价", value: `${preview.manualQuoteCount} 项需人工确认` };
  }
  return {
    label: preview.missingProductCount === 0 ? "预估合计" : "当前已选保费",
    value: preview.knownSubtotal === null ? "继续选择方案" : formatCurrency(preview.knownSubtotal),
  };
}
```

只对纯金额值追加 `/ 年`，人工确认组合文本不重复追加单位。

- [ ] **步骤 5：确认 GREEN 并提交**

```bash
npm test -- tests/unit/calculator.test.ts
npm run test:e2e -- --grep "逐步累计底栏金额|部分报价|少于 8 人" --project=chromium-mobile --workers=1
git add src/features/quote/calculator/quote-preview.ts src/features/quote/components/quote-wizard.tsx tests/unit/calculator.test.ts tests/e2e/quote-flow.spec.ts
git commit -m "feat: preview cumulative quote totals"
```

## 任务 5：全面删除重复文案并收敛结果页状态

**文件：**

- 修改：`src/config/site.ts`
- 修改：`src/features/quote/components/steps/store-step.tsx`
- 修改：`src/features/quote/components/steps/employer-plan-step.tsx`
- 修改：`src/features/quote/components/steps/employees-step.tsx`
- 修改：`src/features/quote/components/steps/liability-plans-step.tsx`
- 修改：`src/features/quote/components/steps/result-step.tsx`
- 修改：`src/app/globals.css`
- 测试：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写文案去重与条件展示 E2E**

```ts
test("各输入步骤只保留与当前决策相关的说明", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("填写一家门店信息", { exact: false })).toHaveCount(0);
  await page.getByLabel("经营面积").fill("260");
  await chooseProducts(page, ["雇主责任险", "公众责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();

  await expect(page.getByText("选择每位员工的保障额度。")).toBeVisible();
  await expect(page.getByText("下一步按人数自动计算", { exact: false })).toHaveCount(0);
  await page.getByLabel("升级版").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await expect(page.getByText("按岗位逐条录入人数", { exact: false })).toHaveCount(0);
});
```

添加公众险单险结果测试：

```ts
test("公众险结果不展示未选择险种的保障说明", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await chooseProducts(page, ["公众责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P2").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  await expect(page.getByText("公众 / 食责：免赔", { exact: false })).toBeVisible();
  await expect(page.getByText("雇主医疗", { exact: false })).toHaveCount(0);
  await expect(page.getByText("雇主误工", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "联系销售 · 确认方案" })).toHaveCount(0);
});
```

运行：`npm run test:e2e -- --grep "只保留与当前决策相关|不展示未选择险种" --project=chromium-mobile --workers=1`

预期：旧介绍、计算说明和无行为按钮导致失败。

- [ ] **步骤 2：按规格清理步骤文案**

- `store-step.tsx`：删除“必填” badge，保留险种说明。
- `employer-plan-step.tsx`：intro 仅为“选择每位员工的保障额度。”，删除底部公式。
- `employees-step.tsx`：删除 intro，保留任务 3 的年龄提示。
- `liability-plans-step.tsx`：删除 intro、公众险“按门店计费”和底部面积说明；食责险提示统一为“需食品生产许可证”。
- `site.ts`：标题收敛为“保费智能预估”，删除不再消费的 description；品牌保留给网页 metadata 和后续销售扩展。

- [ ] **步骤 3：收敛结果页**

非正常结果只保留一个状态标题。保障条目按已选险种条件渲染：

```tsx
<ul className="detail-list">
  {input.products.some((product) => product === "PUBLIC" || product === "FOOD")
    ? <li><CheckCircle aria-hidden="true" />公众 / 食责：免赔 100 元或损失金额 10%，两者取高</li>
    : null}
  {input.products.includes("EMPLOYERS") ? <>
    <li><CheckCircle aria-hidden="true" />雇主医疗：免赔 200 元后按 90% 赔付</li>
    <li><CheckCircle aria-hidden="true" />雇主误工：绝对免赔 3 天，单次不超过 90 天，累计不超过 180 天</li>
    <li><CheckCircle aria-hidden="true" />雇主误工费标准：100 元 / 天</li>
  </> : null}
</ul>
```

删除无行为按钮和 `Phone` 导入，保留非交互扩展区：

```tsx
<div className="sales-contact">
  <strong>{siteConfig.salesContact}</strong>
  <span>正式咨询入口将在后续阶段接入</span>
</div>
```

部分人工报价只保留一条状态说明：

```tsx
<p>
  已知保费小计 {formatCurrency(result.knownSubtotal)}；另有{
    result.items.filter((item) => item.status === "MANUAL_QUOTE").length
  } 项需人工确认，暂不展示最终总价。
</p>
```

- [ ] **步骤 4：确认 GREEN 并提交**

```bash
npm run test:e2e -- --grep "只保留与当前决策相关|不展示未选择险种|部分报价" --project=chromium-mobile --workers=1
git add src/config/site.ts src/features/quote/components/steps/store-step.tsx src/features/quote/components/steps/employer-plan-step.tsx src/features/quote/components/steps/employees-step.tsx src/features/quote/components/steps/liability-plans-step.tsx src/features/quote/components/steps/result-step.tsx src/app/globals.css tests/e2e/quote-flow.spec.ts
git commit -m "fix: reduce quote flow copy duplication"
```

## 任务 6：移动端视觉回归与完整验收

**文件：**

- 修改：`tests/e2e/mobile-layout.spec.ts`（仅补足新行为）
- 修改：`tests/e2e/quote-flow.spec.ts`（仅修正新文案与步骤断言）
- 修改：`src/app/globals.css`（仅修复实测布局问题）

- [ ] **步骤 1：先写 360px 布局测试**

```ts
test("360px 下标题、动态面积提示与渐进底栏不溢出", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  await page.getByLabel("经营面积").fill("2500");
  await page.getByLabel("雇主责任险", { exact: true }).check();

  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(metrics.document).toBeLessThanOrEqual(metrics.viewport);
  await expect(page.locator(".header-row")).toBeVisible();
  await expect(page.locator("#area-help")).toContainText("食责险需人工报价");
  await expect(page.locator(".bottom-summary")).toContainText("已选 1 个险种");
});
```

运行：`npm run test:e2e -- --grep "360px 下标题" --project=chromium-mobile --workers=1`

预期：如有溢出则失败；只调整真实溢出的 `header-row`、`.area-factor-note` 或 `.bottom-summary`。输入字号不得低于 16px，触控区域不得低于 44px。

- [ ] **步骤 2：运行完整自动化检查**

```bash
npm run check
npm run test:e2e -- --workers=4
```

预期：ESLint、TypeScript、全部 Vitest、静态导出构建和三个移动端 Playwright 项目全部通过。

- [ ] **步骤 3：完成浏览器视觉检查**

在 402×874、440×956、360×780 和 874×402 下确认：

- 标题与步骤同排，首屏进度为 0%，勾选险种不倒退。
- 面积提示与输入框至少间隔 12px，长文本自然换行。
- 少于 8 人为红色感叹号，达到 8 人为绿色勾选。
- 软键盘不遮挡输入，底栏在键盘打开时收起。
- 达到 8 人及后续选方案时金额连续累加，无“待完善”。
- 结果页无未选择险种说明，也无无行为按钮。

- [ ] **步骤 4：检查工作区并提交必要修正**

```bash
git diff --check
git status --short
```

若本任务产生测试或样式修正：

```bash
git add tests/e2e/mobile-layout.spec.ts tests/e2e/quote-flow.spec.ts src/app/globals.css
git commit -m "test: verify clarified mobile quote flow"
```

预期：工作区干净，所有提交为英文且粒度与任务对应。
