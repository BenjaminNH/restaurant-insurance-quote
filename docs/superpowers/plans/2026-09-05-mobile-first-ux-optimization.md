# 餐饮保险报价器移动端 UX 优化实施计划

> **供执行 Agent 使用：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐项实施；使用复选框（`- [ ]`）跟踪进度。

**目标：** 在不改变报价规则和计算结果的前提下，把现有报价流程优化为适配 iPhone 17 Pro / Pro Max 的移动端优先体验，降低视觉尺寸，提高数字录入效率，并解决软键盘遮挡问题。

**架构：** 保留现有单页 QuoteWizard 和纯 TypeScript 报价层，仅重构展示与输入交互层。新增一个受 React Hook Form 管理的员工人数控件和一个隔离浏览器 API 的软键盘 Hook；全局样式改为语义令牌驱动的移动端默认样式，再通过 `min-width` 增强桌面布局。

**技术栈：** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS v4、React Hook Form、Zod、Phosphor Icons、Vitest、Playwright、npm。

---

## 一、实施边界与文件职责

实施前必须完整阅读：

- `AGENTS.md`
- `docs/superpowers/specs/2026-09-05-mobile-first-ux-optimization-design.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`

报价规则、结构化规则、计算器和 `docs/design.pen` 不在修改范围内。

```text
playwright.config.ts
  # iPhone 17 Pro / Pro Max 浏览器项目与跨浏览器移动测试

src/app/
  globals.css
    # 语义设计令牌、移动端默认布局、触控状态、安全区和桌面增强
  layout.tsx
    # viewport-fit=cover，允许安全区变量正常工作

src/config/
  site.ts
    # 面向消费者的精简引导和持续可见的险种解释

src/features/quote/
  hooks/
    use-soft-keyboard.ts
      # 封装 VisualViewport、输入焦点、滚动和降级逻辑
  components/
    employee-count-input.tsx
      # 可加减、可直输、带边界和错误状态的岗位人数控件
    quote-wizard.tsx
      # 接入键盘状态、调整首个错误焦点、放置免责声明
    ui.tsx
      # 紧凑进度头、底部操作栏、Phosphor 图标和 hidden 状态
    steps/
      store-step.tsx
        # 面积输入、险种卡片和持续可见的简短解释
      employees-step.tsx
        # 使用员工人数控件并压缩年龄与条件提示
      employer-plan-step.tsx
        # 压缩方案卡片文案和结构
      liability-plans-step.tsx
        # 压缩公众险与食责险方案卡片
      result-step.tsx
        # 缩小金额层级并替换字符图标

tests/e2e/
  quote-flow.spec.ts
    # 输入、键盘、解释文案、焦点和原有报价回归
  mobile-layout.spec.ts
    # 目标视口、触控尺寸、溢出、安全区和响应式专项检查
```

---

### 任务 1：建立 iPhone 17 视口测试基线

**文件：**

- 修改：`playwright.config.ts:1-25`
- 创建：`tests/e2e/mobile-layout.spec.ts`

- [ ] **步骤 1：把目标设备加入 Playwright 项目**

用现有 WebKit iPhone 描述符保留 Safari 行为，并覆盖为目标 CSS 视口：

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3107",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --port 3107",
    url: "http://localhost:3107",
    reuseExistingServer: false,
  },
  projects: [
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
    {
      name: "webkit-iphone-17-pro",
      use: { ...devices["iPhone 15 Pro"], viewport: { width: 402, height: 874 } },
    },
    {
      name: "webkit-iphone-17-pro-max",
      use: { ...devices["iPhone 15 Pro Max"], viewport: { width: 440, height: 956 } },
    },
  ],
});
```

- [ ] **步骤 2：写出移动布局失败测试**

创建 `tests/e2e/mobile-layout.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("目标手机视口无横向溢出且使用紧凑字号", async ({ page }) => {
  await page.goto("/");

  const metrics = await page.evaluate(() => {
    const heading = document.querySelector("h1");
    const area = document.querySelector<HTMLInputElement>("#area");
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      headingSize: heading ? getComputedStyle(heading).fontSize : "",
      inputSize: area ? getComputedStyle(area).fontSize : "",
    };
  });

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.headingSize).toBe("24px");
  expect(metrics.inputSize).toBe("16px");
});

test("主要移动端操作的有效高度不少于 44px", async ({ page }) => {
  await page.goto("/");

  const nextBox = await page.getByRole("button", { name: "下一步" }).boundingBox();
  const productBox = await page.getByLabel("公众责任险", { exact: true }).locator("..").boundingBox();

  expect(nextBox?.height).toBeGreaterThanOrEqual(44);
  expect(productBox?.height).toBeGreaterThanOrEqual(44);
});
```

- [ ] **步骤 3：运行测试并确认字号测试失败**

运行：

```powershell
npm run test:e2e -- tests/e2e/mobile-layout.spec.ts --project=webkit-iphone-17-pro
```

预期：测试因现有主标题为 34px、面积输入大于 16px 而失败；视口项目本身可以启动。

- [ ] **步骤 4：提交测试基线**

```powershell
git add playwright.config.ts tests/e2e/mobile-layout.spec.ts
git commit -m "test: add iPhone 17 UX baselines"
```

---

### 任务 2：建立移动端优先的设计令牌与基础布局

**文件：**

- 修改：`src/app/globals.css:3-140`
- 修改：`src/app/layout.tsx:9-13`

- [ ] **步骤 1：让根视口支持 iPhone 安全区**

在 `src/app/layout.tsx` 中补充 `viewportFit`：

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f9fc",
};
```

- [ ] **步骤 2：以手机为默认值定义语义令牌**

在 `src/app/globals.css` 中保留 `@import "tailwindcss";`，并用下列令牌替代散落的尺寸和颜色：

```css
:root {
  color-scheme: light;
  --color-page: #f7f9fc;
  --color-surface: #ffffff;
  --color-text: #0f172a;
  --color-muted: #53647c;
  --color-border: #cbd8e8;
  --color-primary: #213f67;
  --color-action: #168a43;
  --color-soft: #e9eff7;
  --color-error: #b42318;
  --color-error-soft: #fff5f3;
  --space-1: 0.5rem;
  --space-2: 0.75rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --radius-control: 0.75rem;
  --radius-card: 1rem;
  --touch-target: 2.75rem;
  --content-width: 44rem;
}

* { box-sizing: border-box; }

html { background: var(--color-page); }

body {
  margin: 0;
  background: var(--color-page);
  color: var(--color-text);
  font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
  font-size: 1rem;
  line-height: 1.5;
}

button,
input { font: inherit; }

button { cursor: pointer; touch-action: manipulation; }

.quote-app {
  width: min(100%, var(--content-width));
  margin: 0 auto;
  padding: var(--space-3) var(--space-3)
    calc(6rem + env(safe-area-inset-bottom));
}

h1 {
  margin: var(--space-3) 0 var(--space-1);
  font-size: 1.5rem;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

h2 { margin: 0; font-size: 1.125rem; line-height: 1.35; }

.input-with-unit input { font-size: 1rem; }

.lead,
.step-intro {
  margin: 0 0 var(--space-4);
  color: var(--color-muted);
  font-size: 1rem;
  line-height: 1.55;
}

.step-content,
.result-content { display: grid; gap: var(--space-3); }

.section-card {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

@media (min-width: 48rem) {
  .quote-app {
    padding: 2rem 2rem calc(7rem + env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

同一次编辑中删除原有 `@media (max-width: 600px)` 整段，并确保文件中只有上方这一处 `h1` 字号声明和 `input-with-unit input` 字号声明。暂未迁移的选择卡片、结果卡片和状态类保留现有行为，但移除其中与上述两个字号冲突的声明；后续任务再逐组替换其几何样式。

- [ ] **步骤 3：运行基线测试并确认核心尺寸通过**

运行：

```powershell
npm run test:e2e -- tests/e2e/mobile-layout.spec.ts --project=webkit-iphone-17-pro
```

预期：主标题为 24px、面积输入最终为 16px、页面无横向溢出、现有主要操作高度不少于 44px。

- [ ] **步骤 4：运行静态检查并提交**

```powershell
npm run lint
npm run typecheck
git add src/app/globals.css src/app/layout.tsx
git commit -m "style: establish mobile-first quote layout"
```

预期：ESLint 和 TypeScript 均通过。

---

### 任务 3：压缩顶部进度与底部操作区

**文件：**

- 修改：`src/features/quote/components/ui.tsx:1-73`
- 修改：`src/features/quote/components/quote-wizard.tsx:16-104`
- 修改：`src/app/globals.css`
- 修改：`tests/e2e/quote-flow.spec.ts:29-42`

- [ ] **步骤 1：先更新进度、免责声明和按钮语义测试**

把首个流程测试中的进度断言改成紧凑文本，并增加图标字符清理断言：

```ts
test("显示紧凑进度、免责声明与移动端表单语义", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "餐饮门店保费智能预估" })).toBeVisible();
  await expect(page.getByText("第 1/2 步", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "报价进度" })).toHaveAttribute("aria-valuenow", "50");
  await expect(page.getByLabel("经营面积")).toHaveAttribute("inputmode", "decimal");
  await expect(page.getByRole("button", { name: "下一步" })).toBeVisible();
  await expect(page.getByText("预估保费仅供参考", { exact: false })).toBeVisible();
  await expect(page.getByText("→", { exact: true })).toHaveCount(0);
});
```

- [ ] **步骤 2：运行测试并确认旧进度文本导致失败**

```powershell
npm run test:e2e -- tests/e2e/quote-flow.spec.ts --project=chromium-mobile --grep "紧凑进度"
```

预期：找不到“第 1/2 步”或 `progressbar` 属性而失败。

- [ ] **步骤 3：实现紧凑公共 UI**

在 `ui.tsx` 使用 Phosphor 图标，并让底栏支持键盘隐藏状态：

```tsx
import { ArrowLeft, ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export function ProgressHeader({
  title,
  description,
  current,
  total,
  section,
}: {
  title: string;
  description?: string;
  current: number;
  total: number;
  section: string;
}) {
  const percent = Math.round((current / total) * 100);
  return (
    <header className="quote-header">
      <div className="header-row">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><ShieldCheck weight="fill" /></span>
          <span className="brand-name">餐饮安心保</span>
        </div>
        <span className="step-count">第 {current}/{total} 步</span>
      </div>
      <h1>{title}</h1>
      {description ? <p className="lead">{description}</p> : null}
      <div className="progress-label"><strong>{section}</strong><span>{percent}%</span></div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="报价进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="progress-value" style={{ width: `${percent}%` }} />
      </div>
    </header>
  );
}

export function BottomBar({ onBack, onNext, nextLabel, summary, disabled = false, hidden = false }: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  summary?: ReactNode;
  disabled?: boolean;
  hidden?: boolean;
}) {
  return (
    <div className="bottom-wrap" hidden={hidden}>
      <div className="bottom-bar">
        {onBack ? <button type="button" className="back-button" onClick={onBack}><ArrowLeft aria-hidden="true" />上一步</button> : null}
        {summary ? <div className="bottom-summary">{summary}</div> : null}
        <button type="button" className="primary-button" onClick={onNext} disabled={disabled}>
          {nextLabel}<ArrowRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
```

保留 `SectionCard`、`FieldError` 和 `formatCurrency` 的现有导出。

在 `quote-wizard.tsx` 的步骤主体之后、BottomBar 之前增加：

```tsx
<p className="quote-disclaimer">{siteConfig.disclaimer}</p>
```

底栏摘要压缩为一行状态和一行金额；员工数量并入状态文本，不再创建第三行。

- [ ] **步骤 4：补齐公共 UI 样式**

在 `globals.css` 中实现：

```css
.header-row,
.brand-lockup,
.progress-label,
.bottom-bar { display: flex; align-items: center; }

.header-row { justify-content: space-between; gap: var(--space-2); }
.brand-lockup { gap: var(--space-1); font-weight: 700; color: var(--color-primary); }
.brand-mark { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 0.625rem; background: var(--color-soft); }
.brand-mark svg { width: 1.25rem; height: 1.25rem; }
.brand-name { font-size: 1rem; }
.step-count { color: var(--color-muted); font-size: 0.875rem; }
.progress-label { justify-content: space-between; margin-top: var(--space-2); color: var(--color-primary); font-size: 0.875rem; }
.progress-track { height: 0.25rem; margin: var(--space-1) 0 var(--space-4); overflow: hidden; border-radius: 999px; background: #e7edf4; }
.progress-value { height: 100%; border-radius: inherit; background: var(--color-primary); transition: width 160ms ease; }
.quote-disclaimer { margin: var(--space-3) 0 0; color: var(--color-muted); font-size: 0.75rem; line-height: 1.5; text-align: center; }
.bottom-wrap { position: fixed; z-index: 10; inset: auto 0 0; border-top: 1px solid var(--color-border); background: rgb(255 255 255 / 96%); padding-bottom: env(safe-area-inset-bottom); backdrop-filter: blur(12px); }
.bottom-wrap[hidden] { display: none; }
.bottom-bar { width: min(100%, var(--content-width)); min-height: 4.5rem; margin: 0 auto; gap: var(--space-1); padding: var(--space-2) var(--space-3); }
.bottom-summary { display: grid; flex: 1; min-width: 0; color: var(--color-muted); font-size: 0.75rem; }
.bottom-summary strong { overflow: hidden; color: var(--color-primary); font-size: 1.125rem; text-overflow: ellipsis; white-space: nowrap; }
.back-button,
.primary-button { display: inline-flex; align-items: center; justify-content: center; gap: 0.375rem; min-height: var(--touch-target); border-radius: var(--radius-control); padding: 0 var(--space-2); font-size: 1rem; font-weight: 700; }
.back-button { border: 1px solid var(--color-primary); background: var(--color-surface); color: var(--color-primary); }
.primary-button { min-width: 7.25rem; border: 0; background: var(--color-action); color: #fff; }
.back-button svg,
.primary-button svg { width: 1rem; height: 1rem; }
```

- [ ] **步骤 5：运行测试并提交**

```powershell
npm run test:e2e -- tests/e2e/quote-flow.spec.ts --project=chromium-mobile --grep "紧凑进度"
npm run lint
npm run typecheck
git add src/features/quote/components/ui.tsx src/features/quote/components/quote-wizard.tsx src/app/globals.css tests/e2e/quote-flow.spec.ts
git commit -m "feat: compact quote navigation"
```

预期：紧凑进度和免责声明测试通过，静态检查通过。

---

### 任务 4：优化面积输入与险种选择卡片

**文件：**

- 修改：`src/config/site.ts:3-33`
- 修改：`src/features/quote/components/steps/store-step.tsx:1-59`
- 修改：`src/app/globals.css`
- 修改：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写持续可见险种解释测试**

在 `quote-flow.spec.ts` 增加：

```ts
test("三种险种都直接显示简短解释且面积只使用直接输入", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("员工工作期间发生意外时提供保障，8 人起保")).toBeVisible();
  await expect(page.getByText("顾客在店内发生意外或财物损失时提供保障")).toBeVisible();
  await expect(page.getByText("食品安全事故造成损失时提供保障")).toBeVisible();
  await expect(page.getByRole("button", { name: /了解详情/ })).toHaveCount(0);
  await expect(page.getByLabel("经营面积")).toHaveAttribute("type", "number");
  await expect(page.getByRole("button", { name: /平方米/ })).toHaveCount(0);
});
```

- [ ] **步骤 2：运行测试并确认旧险种文案导致失败**

```powershell
npm run test:e2e -- tests/e2e/quote-flow.spec.ts --project=chromium-mobile --grep "简短解释"
```

预期：找不到新的三句解释而失败。

- [ ] **步骤 3：精简配置文案**

更新 `site.ts`：

```ts
export const siteConfig = {
  brand: "餐饮安心保",
  title: "餐饮门店保费智能预估",
  description: "填写一家门店信息，约 1 分钟获得所选险种的预估保费。",
  disclaimer: "预估保费仅供参考，最终以保险公司正式核保与保单为准",
  salesContact: "餐饮安心保顾问",
} as const;

export const productCopy: Record<Product, { label: string; description: string; price: string }> = {
  EMPLOYERS: {
    label: "雇主责任险",
    description: "员工工作期间发生意外时提供保障，8 人起保",
    price: "按岗位与人数计费",
  },
  PUBLIC: {
    label: "公众责任险",
    description: "顾客在店内发生意外或财物损失时提供保障",
    price: "¥600 起 / 店 / 年",
  },
  FOOD: {
    label: "食品安全责任险",
    description: "食品安全事故造成损失时提供保障",
    price: "¥800 起 / 店 / 年",
  },
};
```

- [ ] **步骤 4：更新门店步骤结构**

在 `store-step.tsx`：

- 将“① 餐饮门店信息”改为“门店信息”。
- 将“② 选择险种”改为“选择险种”。
- 保留原生 `type="number"`、`inputMode="decimal"`、`step="any"` 和右侧“㎡”。
- 将面积说明改为“系统会按经营面积匹配适用档位，超出范围时提示人工报价。”，避免写死某一个险种的面积上限。
- 用 Phosphor `Check` 图标替换字符 `✓`，只在当前选项已选中时渲染。
- 为选项卡片保留隐藏的原生 checkbox，并通过 `:has(input:focus-visible)` 显示焦点环。

核心选择标记写法：

```tsx
import { Check } from "@phosphor-icons/react";

<span className="checkmark" aria-hidden="true">
  {checked ? <Check weight="bold" /> : null}
</span>
```

- [ ] **步骤 5：补齐面积与选择卡片紧凑样式**

```css
.card-heading { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-2); margin-bottom: var(--space-3); }
.area-row { display: grid; gap: var(--space-1); }
.area-row label { font-weight: 700; }
.input-with-unit { display: flex; align-items: center; min-height: 3rem; border: 1px solid var(--color-border); border-radius: var(--radius-control); background: var(--color-surface); padding: 0 var(--space-2); }
.input-with-unit:focus-within { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgb(33 63 103 / 16%); }
.input-with-unit input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; padding: 0.75rem 0; color: var(--color-text); font-size: 1rem; }
.input-with-unit span { color: var(--color-muted); }
.product-list,
.radio-list { display: grid; gap: var(--space-1); }
.product-choice,
.plan-choice { display: flex; align-items: center; gap: var(--space-2); min-height: 3.25rem; border: 1px solid var(--color-border); border-radius: var(--radius-control); padding: 0.625rem var(--space-2); background: var(--color-surface); color: var(--color-text); }
.product-choice.selected,
.plan-choice.selected { border-color: var(--color-primary); background: var(--color-soft); }
.product-choice:has(input:focus-visible),
.plan-choice:has(input:focus-visible) { outline: 3px solid rgb(33 63 103 / 18%); outline-offset: 2px; }
.checkmark,
.radio-mark { display: grid; place-items: center; flex: 0 0 1.25rem; width: 1.25rem; height: 1.25rem; border: 2px solid var(--color-muted); }
.checkmark { border-radius: 0.375rem; }
.checkmark svg { width: 0.875rem; height: 0.875rem; }
.choice-copy { display: grid; flex: 1; min-width: 0; gap: 0.125rem; }
.choice-copy strong { font-size: 1rem; }
.choice-copy span { color: var(--color-muted); font-size: 0.875rem; line-height: 1.4; }
.choice-price { color: var(--color-primary); font-size: 0.875rem; font-weight: 700; text-align: right; }
```

- [ ] **步骤 6：运行回归并提交**

```powershell
npm run test:e2e -- tests/e2e/quote-flow.spec.ts --project=chromium-mobile --grep "简短解释|刷新后恢复|取消险种"
npm run lint
npm run typecheck
git add src/config/site.ts src/features/quote/components/steps/store-step.tsx src/app/globals.css tests/e2e/quote-flow.spec.ts
git commit -m "feat: streamline store inputs"
```

预期：险种解释持续可见，面积仍可直输，草稿与取消险种行为不变。

---

### 任务 5：实现可直输的员工人数加减控件

**文件：**

- 创建：`src/features/quote/components/employee-count-input.tsx`
- 修改：`src/features/quote/components/steps/employees-step.tsx:1-45`
- 修改：`src/app/globals.css`
- 修改：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写员工人数控件失败测试**

在 `quote-flow.spec.ts` 增加辅助函数和测试：

```ts
async function openEmployeeStep(page: Page) {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await chooseProducts(page, ["雇主责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("升级版").check();
  await page.getByRole("button", { name: "下一步" }).click();
}

test("员工人数支持拇指加减和键盘直输", async ({ page }) => {
  await openEmployeeStep(page);

  const waiter = page.getByLabel("服务员人数", { exact: true });
  await expect(page.getByRole("button", { name: "减少服务员人数" })).toBeDisabled();
  await page.getByRole("button", { name: "增加服务员人数" }).click();
  await expect(waiter).toHaveValue("1");
  await waiter.fill("12");
  await waiter.blur();
  await expect(waiter).toHaveValue("12");

  const plusBox = await page.getByRole("button", { name: "增加服务员人数" }).boundingBox();
  expect(plusBox?.width).toBeGreaterThanOrEqual(44);
  expect(plusBox?.height).toBeGreaterThanOrEqual(44);
});

test("员工人数失焦时规范为非负整数", async ({ page }) => {
  await openEmployeeStep(page);
  const waiter = page.getByLabel("服务员人数", { exact: true });

  await waiter.fill("-3");
  await waiter.blur();
  await expect(waiter).toHaveValue("0");

  await waiter.fill("2.8");
  await waiter.blur();
  await expect(waiter).toHaveValue("2");
});
```

- [ ] **步骤 2：运行测试并确认缺少按钮而失败**

```powershell
npm run test:e2e -- tests/e2e/quote-flow.spec.ts --project=webkit-iphone-17-pro --grep "员工人数"
```

预期：找不到“增加服务员人数”按钮。

- [ ] **步骤 3：创建员工人数控件**

创建 `employee-count-input.tsx`：

```tsx
import { Minus, Plus } from "@phosphor-icons/react";
import { useController, useFormContext } from "react-hook-form";
import type { EmployerRole, QuoteInput } from "@/features/quote/types";
import { FieldError } from "./ui";

export function EmployeeCountInput({ role, label, rate, min = 0, max }: {
  role: EmployerRole;
  label: string;
  rate?: number;
  min?: number;
  max?: number;
}) {
  const { control } = useFormContext<QuoteInput>();
  const { field, fieldState } = useController({
    control,
    name: `employeeCounts.${role}`,
  });
  const id = `employee-${role}`;
  const errorId = `${id}-error`;
  const finiteValue = Number.isFinite(field.value) ? Number(field.value) : min;
  const normalizedValue = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, Math.trunc(finiteValue)));

  function commit(value: number) {
    field.onChange(Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, Math.trunc(value))));
  }

  return (
    <div className="employee-field">
      <div className="employee-row">
        <div className="employee-copy">
          <label htmlFor={id}>{label}</label>
          {rate !== undefined ? <span>¥{rate} / 人 / 年</span> : null}
        </div>
        <div className="employee-counter">
          <button type="button" aria-label={`减少${label}`} disabled={normalizedValue <= min} onClick={() => commit(normalizedValue - 1)}>
            <Minus aria-hidden="true" />
          </button>
          <input
            {...field}
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            value={Number.isFinite(field.value) ? field.value : ""}
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? errorId : undefined}
            onChange={(event) => field.onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
            onBlur={() => { commit(finiteValue); field.onBlur(); }}
          />
          <button type="button" aria-label={`增加${label}`} disabled={max !== undefined && normalizedValue >= max} onClick={() => commit(normalizedValue + 1)}>
            <Plus aria-hidden="true" />
          </button>
        </div>
      </div>
      {fieldState.error ? <div id={errorId}><FieldError>{fieldState.error.message}</FieldError></div> : null}
    </div>
  );
}
```

当前规则只有下限 0，因此调用处不传 `max`；保留可选 `max` 是为了未来配置扩展，不创造新的承保上限。

- [ ] **步骤 4：在员工步骤复用组件**

用下列结构替换 `employees-step.tsx` 中每个裸数字输入：

```tsx
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
```

删除原组件对 `register` 的使用和逐项重复 FieldError；年龄单选与总人数计算保持不变。

- [ ] **步骤 5：实现适配 360—440px 的控件样式**

```css
.employee-list { display: grid; gap: var(--space-2); }
.employee-field { display: grid; gap: 0.25rem; }
.employee-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); min-width: 0; }
.employee-copy { display: grid; min-width: 0; gap: 0.125rem; }
.employee-copy label { font-size: 1rem; font-weight: 700; }
.employee-copy span { color: var(--color-muted); font-size: 0.75rem; }
.employee-counter { display: grid; flex: 0 0 auto; grid-template-columns: var(--touch-target) 3rem var(--touch-target); overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-control); background: var(--color-surface); }
.employee-counter button { display: grid; place-items: center; width: var(--touch-target); min-height: var(--touch-target); border: 0; background: transparent; color: var(--color-primary); }
.employee-counter button:active:not(:disabled) { background: var(--color-soft); }
.employee-counter button:disabled { color: #98a2b3; cursor: not-allowed; }
.employee-counter button svg { width: 1rem; height: 1rem; }
.employee-counter input { width: 3rem; min-width: 0; border: 0; border-inline: 1px solid var(--color-border); outline: 0; background: transparent; color: var(--color-text); font-size: 1rem; text-align: center; font-variant-numeric: tabular-nums; }
.employee-counter:focus-within { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgb(33 63 103 / 16%); }
```

- [ ] **步骤 6：运行员工与报价回归并提交**

```powershell
npm run test:e2e -- tests/e2e/quote-flow.spec.ts --project=webkit-iphone-17-pro --grep "员工人数|3984|少于 8 人|年龄范围"
npm run lint
npm run typecheck
git add src/features/quote/components/employee-count-input.tsx src/features/quote/components/steps/employees-step.tsx src/app/globals.css tests/e2e/quote-flow.spec.ts
git commit -m "feat: add touch-friendly employee counters"
```

预期：加减和直输测试通过，3,984 元正常路径、不承保和人工报价结果不变。

---

### 任务 6：解决软键盘遮挡并修正首个错误焦点

**文件：**

- 创建：`src/features/quote/hooks/use-soft-keyboard.ts`
- 修改：`src/features/quote/components/quote-wizard.tsx:20-104`
- 修改：`src/app/globals.css`
- 修改：`tests/e2e/mobile-layout.spec.ts`
- 修改：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写 VisualViewport 键盘失败测试**

在 `mobile-layout.spec.ts` 增加：

```ts
test("数字键盘压缩可视区域时收起底栏并保留当前字段", async ({ page }) => {
  await page.addInitScript(() => {
    class MockVisualViewport extends EventTarget {
      height = window.innerHeight;
      width = window.innerWidth;
      offsetLeft = 0;
      offsetTop = 0;
      pageLeft = 0;
      pageTop = 0;
      scale = 1;
    }
    const viewport = new MockVisualViewport();
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    (window as unknown as { __setVisualViewportHeight: (height: number) => void }).__setVisualViewportHeight = (height) => {
      viewport.height = height;
      viewport.dispatchEvent(new Event("resize"));
    };
  });

  await page.goto("/");
  await page.getByLabel("经营面积").focus();
  await page.evaluate(() => (window as unknown as { __setVisualViewportHeight: (height: number) => void }).__setVisualViewportHeight(377));

  await expect(page.locator(".bottom-wrap")).toBeHidden();
  await expect(page.getByLabel("经营面积")).toBeInViewport();

  await page.evaluate(() => (window as unknown as { __setVisualViewportHeight: (height: number) => void }).__setVisualViewportHeight(window.innerHeight));
  await expect(page.locator(".bottom-wrap")).toBeVisible();
});
```

- [ ] **步骤 2：运行测试并确认底栏仍可见**

```powershell
npm run test:e2e -- tests/e2e/mobile-layout.spec.ts --project=webkit-iphone-17-pro --grep "数字键盘"
```

预期：现有底栏没有键盘状态，`toBeHidden()` 失败。

- [ ] **步骤 3：实现隔离浏览器 API 的 Hook**

创建 `use-soft-keyboard.ts`：

```ts
"use client";

import { useEffect, useState } from "react";

const KEYBOARD_THRESHOLD = 120;

function isEditable(element: Element | null): element is HTMLElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
}

export function useSoftKeyboard() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    let focusWithinEditable = isEditable(document.activeElement);

    function sync() {
      const active = document.activeElement;
      focusWithinEditable = isEditable(active);
      const heightReduced = viewport ? window.innerHeight - viewport.height > KEYBOARD_THRESHOLD : focusWithinEditable;
      const nextOpen = focusWithinEditable && heightReduced;
      setIsOpen(nextOpen);

      if (nextOpen && active instanceof HTMLElement) {
        const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
        requestAnimationFrame(() => active.scrollIntoView({ block: "center", behavior }));
      }
    }

    function handleFocusOut() {
      requestAnimationFrame(sync);
    }

    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", handleFocusOut);
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    sync();

    return () => {
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", handleFocusOut);
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
    };
  }, []);

  return isOpen;
}
```

- [ ] **步骤 4：接入向导与底栏**

在 `QuoteWizard` 顶层调用：

```tsx
const isSoftKeyboardOpen = useSoftKeyboard();
```

主元素增加状态属性：

```tsx
<main className="quote-app" data-soft-keyboard={isSoftKeyboardOpen ? "open" : "closed"}>
```

BottomBar 增加：

```tsx
hidden={isSoftKeyboardOpen}
```

同时修正 STORE 步骤的焦点逻辑：面积无效时聚焦 `area`；面积有效但未选险种时，聚焦第一个 `input[name="products"]`，不能再次把焦点放到已合法的面积字段。

```ts
if (issues.length) {
  setErrorSummary(`请完善：${issues.join("、")}`);
  if (!Number.isFinite(current.area) || current.area <= 0) {
    setFocus("area");
  } else {
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[name="products"]')?.focus());
  }
  return false;
}
```

- [ ] **步骤 5：增加键盘状态样式**

```css
.quote-app[data-soft-keyboard="open"] { padding-bottom: var(--space-4); }
```

不创建模拟键盘高度，不使用 `100vh`；滚动空间由真实页面和 `VisualViewport` 状态决定。

- [ ] **步骤 6：补充只缺险种时的焦点测试**

在 `quote-flow.spec.ts` 增加：

```ts
test("面积有效但未选险种时聚焦第一个险种", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("120");
  await page.getByRole("button", { name: "下一步" }).click();

  await expect(page.getByLabel("雇主责任险", { exact: true })).toBeFocused();
});
```

- [ ] **步骤 7：运行键盘与焦点测试并提交**

```powershell
npm run test:e2e -- tests/e2e/mobile-layout.spec.ts --project=webkit-iphone-17-pro --grep "数字键盘"
npm run test:e2e -- tests/e2e/quote-flow.spec.ts --project=chromium-mobile --grep "聚焦"
npm run lint
npm run typecheck
git add src/features/quote/hooks/use-soft-keyboard.ts src/features/quote/components/quote-wizard.tsx src/app/globals.css tests/e2e/mobile-layout.spec.ts tests/e2e/quote-flow.spec.ts
git commit -m "fix: keep mobile inputs above keyboard"
```

预期：键盘压缩视口时底栏隐藏，恢复高度后显示；校验焦点指向第一个真实错误字段。

---

### 任务 7：统一剩余步骤、结果页和交互状态

**文件：**

- 修改：`src/features/quote/components/steps/employer-plan-step.tsx:1-33`
- 修改：`src/features/quote/components/steps/employees-step.tsx`
- 修改：`src/features/quote/components/steps/liability-plans-step.tsx:1-47`
- 修改：`src/features/quote/components/steps/result-step.tsx:1-36`
- 修改：`src/app/globals.css`
- 修改：`tests/e2e/mobile-layout.spec.ts`

- [ ] **步骤 1：先写字符图标和紧凑结果失败测试**

在 `mobile-layout.spec.ts` 增加：

```ts
test("结构性字符图标被替换且结果金额不过度放大", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await page.getByLabel("公众责任险", { exact: true }).check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P2").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  const amountSize = await page.locator(".total-amount").evaluate((element) => getComputedStyle(element).fontSize);
  expect(Number.parseFloat(amountSize)).toBeLessThanOrEqual(32);
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(/[✓ⓘ▧☎→]/);
});
```

- [ ] **步骤 2：运行测试并确认现有 40px 金额导致失败**

```powershell
npm run test:e2e -- tests/e2e/mobile-layout.spec.ts --project=webkit-iphone-17-pro --grep "结构性字符"
```

预期：结果金额大于 32px，或页面仍存在字符图标。

- [ ] **步骤 3：替换剩余字符图标并精简重复说明**

- `employees-step.tsx`：用 `CheckCircle` 和 `Info` 替换 `✓`、`ⓘ`；保留最低 8 人和年龄说明。
- `result-step.tsx`：用 `CheckCircle`、`FileText`、`Phone` 替换 `✓`、`▧`、`☎`；保持每条保障和资料文本不变。
- `employer-plan-step.tsx`：保留一次档位解释，卡片只显示方案名称和关键赔付上限。
- `liability-plans-step.tsx`：保留方案限额、基础价格、许可证提示和面积系数提示，不删除影响选择的事实。

结果列表图标写法统一为：

```tsx
<li><CheckCircle aria-hidden="true" />公众 / 食责：免赔 100 元或损失金额 10%，两者取高</li>
<li><FileText aria-hidden="true" />营业执照（副本）</li>
```

联系销售按钮写法：

```tsx
<button type="button" className="contact-button"><Phone aria-hidden="true" />联系销售 · 确认方案</button>
```

- [ ] **步骤 4：补齐选择、状态和结果样式**

```css
.info-note,
.condition-note { padding: var(--space-2); border-radius: var(--radius-control); background: var(--color-soft); color: var(--color-muted); font-size: 0.875rem; line-height: 1.5; }
.condition-note { display: grid; gap: 0.25rem; }
.age-fieldset { display: flex; flex-wrap: wrap; gap: var(--space-1); margin-top: var(--space-3); padding: var(--space-3) 0 0; border: 0; border-top: 1px solid var(--color-border); }
.age-fieldset legend { flex-basis: 100%; font-size: 1rem; font-weight: 700; }
.inline-choice { display: inline-flex; align-items: center; gap: var(--space-1); min-height: var(--touch-target); border: 1px solid var(--color-border); border-radius: var(--radius-control); padding: 0 var(--space-2); }
.result-hero { padding: var(--space-4); border-radius: var(--radius-card); background: var(--color-primary); color: #fff; }
.total-amount { margin-top: var(--space-1); font-size: 2rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.result-item,
.result-subtotal { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding-bottom: var(--space-2); border-bottom: 1px solid #e2e8f0; }
.result-item > strong,
.result-subtotal strong { color: var(--color-primary); font-size: 1.125rem; white-space: nowrap; font-variant-numeric: tabular-nums; }
.detail-list { display: grid; gap: var(--space-2); margin: var(--space-3) 0 0; padding: 0; list-style: none; color: var(--color-muted); }
.detail-list li { display: grid; grid-template-columns: 1.25rem 1fr; gap: var(--space-1); align-items: start; }
.detail-list svg { width: 1.125rem; height: 1.125rem; color: var(--color-action); margin-top: 0.125rem; }
.contact-button { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-1); min-height: var(--touch-target); }
```

补齐 `:hover`（仅 `@media (hover: hover)`）、`:active`、`:focus-visible`、`:disabled` 和选中状态；颜色不是任何状态的唯一表达方式。

- [ ] **步骤 5：运行流程与布局回归并提交**

```powershell
npm run test:e2e -- tests/e2e/mobile-layout.spec.ts --project=webkit-iphone-17-pro --grep "结构性字符"
npm run test:e2e -- tests/e2e/quote-flow.spec.ts --project=chromium-mobile
npm run lint
npm run typecheck
git add src/features/quote/components/steps src/app/globals.css tests/e2e/mobile-layout.spec.ts
git commit -m "style: refine quote cards and results"
```

预期：完整 Chromium 移动流程通过，结果金额不大于 32px，页面不再使用结构性字符图标。

---

### 任务 8：完成多视口、可访问性和静态导出验收

**文件：**

- 修改：`tests/e2e/mobile-layout.spec.ts`

- [ ] **步骤 1：增加窄屏、Pro Max 和横屏溢出测试**

在 `mobile-layout.spec.ts` 增加：

```ts
for (const viewport of [
  { name: "360px 窄屏", width: 360, height: 780 },
  { name: "iPhone 17 Pro", width: 402, height: 874 },
  { name: "iPhone 17 Pro Max", width: 440, height: 956 },
  { name: "iPhone 17 Pro 横屏", width: 874, height: 402 },
]) {
  test(`${viewport.name} 无横向溢出`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    const sizes = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(sizes.document).toBeLessThanOrEqual(sizes.viewport);
  });
}
```

- [ ] **步骤 2：运行两个主要 iPhone 项目**

```powershell
npm run test:e2e -- --project=webkit-iphone-17-pro
npm run test:e2e -- --project=webkit-iphone-17-pro-max
```

预期：全部流程、键盘模拟和布局专项测试通过。若失败，暂停验收步骤并使用 `systematic-debugging` 定位产生溢出的具体选择器；修正只能采用移除固定最小宽度、允许网格换行或允许文本断行三种方式，不得把可编辑文字缩小到 16px 以下，也不得缩小 44px 触控区域。

- [ ] **步骤 3：执行完整质量检查**

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

预期：

- ESLint 通过。
- TypeScript 无错误。
- 所有 Vitest 测试通过。
- Chromium、iPhone 17 Pro 和 iPhone 17 Pro Max 的 Playwright 流程通过。
- `next build` 成功生成静态 `out/`。

- [ ] **步骤 4：检查本次改动未触碰业务事实来源**

```powershell
git diff --name-only ce6796f..HEAD
git diff --check
git status --short
rg -n '[✓ⓘ▧☎→]' src/features/quote/components
```

预期：文件列表中不包含 `docs/design.pen`、`docs/餐饮保险报价器-保费规则梳理.md`、`docs/餐饮保险报价器-MVP规则.json`、`src/config/quote-rules.ts` 或 `src/features/quote/calculator/`；`git diff --check` 无输出；`git status --short` 无输出；`rg` 因找不到结构性字符图标而以退出码 1 结束且不输出匹配行。

- [ ] **步骤 5：提交最终验收修正**

仅当步骤 2—4 产生必要修正时执行：

```powershell
git add tests/e2e/mobile-layout.spec.ts src/app/globals.css src/features/quote/components
git commit -m "test: verify responsive quote experience"
```

若没有文件变化，不创建空提交。

---

## 二、最终验收清单

- [ ] iPhone 17 Pro（402px）和 Pro Max（440px）均无横向溢出。
- [ ] 主标题为 24px，所有可编辑字段文本不低于 16px。
- [ ] 主要触控目标不小于约 44×44px。
- [ ] 营业面积只提供直接输入，没有快捷面积选项。
- [ ] 三种险种解释在卡片中持续可见且话术精简。
- [ ] 员工人数可加减、可直输，并在失焦时规范为非负整数。
- [ ] 数字键盘压缩可视区域时底栏收起，字段与错误提示保持可见。
- [ ] 键盘关闭后底栏恢复，并正确处理底部安全区。
- [ ] 第一个错误字段获得焦点。
- [ ] 字符和 emoji 结构图标已替换为 Phosphor 图标。
- [ ] 桌面端仍为易读的居中单列，不维护独立流程。
- [ ] 报价规则、状态、金额和静态导出结果保持不变。
