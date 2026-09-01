# 餐饮保险报价器 MVP 实施计划

> **供执行 Agent 使用：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐项实施；使用复选框（`- [ ]`）跟踪进度。

**目标：** 交付一个移动端优先、支持静态导出的单门店餐饮保险报价器，覆盖三个险种、动态步骤、规则版本校验、五类报价状态和会话草稿恢复。

**架构：** 使用 Next.js App Router 构建单页动态向导；React Hook Form 和 Zod 管理输入；纯 TypeScript 报价引擎读取 `mvp-1.1` 规则并输出类型化结果；UI 只渲染规则和计算结果。应用使用 `output: "export"` 生成 `out/`，不使用任何运行时服务端能力。

**技术栈：** Next.js App Router、React、TypeScript、Tailwind CSS、React Hook Form、Zod、Vitest、Playwright、pnpm。

---

## 一、文件职责总览

实施完成后，核心文件结构如下：

```text
src/
  app/
    globals.css                         # 设计令牌、全局样式和移动端安全区
    layout.tsx                          # 页面元数据和根布局
    page.tsx                            # 静态入口，注入规则和公开联系配置
  config/
    quote-rules.ts                      # 校验并导出 mvp-1.1 规则
    site.ts                             # 默认公开联系配置和未来员工配置扩展类型
  features/quote/
    calculator/
      calculate-quote.ts                # 三险汇总和整体状态聚合
      employers-liability.ts            # 雇主责任险人数、年龄和岗位计算
      liability-by-area.ts              # 公众险和食责险面积档位计算
      money.ts                           # 人民币最终展示舍入
    components/
      employee-count-input.tsx          # 可输入且可加减的岗位人数控件
      plan-selector.tsx                 # 通用单选方案卡
      product-selector.tsx              # 险种多选卡
      quote-result-view.tsx             # 正常、人工、部分和不承保结果
      quote-shell.tsx                   # 标题、进度和吸底操作区
      sales-contact-action.tsx          # 独立销售联系扩展点
    schemas/
      quote-input-schema.ts             # 条件必填和字段错误文案
      quote-rules-schema.ts             # 规则 JSON 运行时校验
    state/
      quote-draft-storage.ts             # sessionStorage 版本化草稿
      quote-step-flow.ts                 # 动态步骤列表
    steps/
      employee-info-step.tsx            # 岗位人数和年龄资格
      employer-plan-step.tsx             # 雇主险四档
      liability-plans-step.tsx           # 公众险和食责险方案
      quote-result-step.tsx              # 结果步骤适配器
      store-and-products-step.tsx        # 单门店面积和险种选择
    types.ts                             # 输入、规则、步骤和结果公共类型
    quote-wizard.tsx                    # 表单上下文、导航、计算和草稿编排
tests/
  e2e/quote-flow.spec.ts                # 主要用户路径和异常状态
  unit/calculator.test.ts               # 费率、边界、示例和状态聚合
  unit/draft-storage.test.ts             # 草稿版本和损坏恢复
  unit/quote-input-schema.test.ts        # 条件校验
  unit/quote-rules-schema.test.ts        # 规则配置校验
  unit/quote-step-flow.test.ts           # 动态步骤
```

---

### 任务 1：建立可静态导出的 Next.js 工程

**文件：**
- 创建：`package.json`
- 创建：`pnpm-lock.yaml`
- 创建：`next.config.ts`
- 创建：`tsconfig.json`
- 创建：`postcss.config.mjs`
- 创建：`eslint.config.mjs`
- 创建：`vitest.config.ts`
- 创建：`playwright.config.ts`
- 创建：`src/app/layout.tsx`
- 创建：`src/app/page.tsx`
- 创建：`src/app/globals.css`

- [ ] **步骤 1：检查 Node.js 和 pnpm**

运行：

```powershell
node --version
pnpm --version
```

预期：Node.js 为 Playwright 当前支持的 22、24 或 26 主版本之一，pnpm 命令可用。若 Node.js 不符合要求，先切换运行时，不创建项目文件。

- [ ] **步骤 2：安装运行时依赖**

运行：

```powershell
pnpm init
pnpm add next@latest react@latest react-dom@latest react-hook-form zod @hookform/resolvers @phosphor-icons/react
pnpm add -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss postcss eslint eslint-config-next vitest jsdom @playwright/test
pnpm exec playwright install chromium webkit
```

预期：生成 `package.json` 和 `pnpm-lock.yaml`，依赖安装无错误，Chromium 和 WebKit 浏览器安装完成。

- [ ] **步骤 3：补齐脚本和基础配置**

将 `package.json` 的脚本设置为：

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

创建 `next.config.ts`：

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
```

创建 `postcss.config.mjs`：

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

创建 `eslint.config.mjs`：

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([".next/**", "out/**", "coverage/**", "playwright-report/**"]),
]);
```

创建 `vitest.config.ts`：

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: { reporter: ["text", "html"] },
  },
});
```

创建 `playwright.config.ts`：

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 1,
  reporter: "html",
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
  projects: [
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
    { name: "webkit-mobile", use: { ...devices["iPhone 15"] } },
  ],
});
```

- [ ] **步骤 4：创建最小静态页面**

创建 `src/app/layout.tsx`：

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "餐饮安心保",
  description: "餐饮门店责任保险保费智能预估",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

创建 `src/app/page.tsx`：

```tsx
export default function HomePage() {
  return <main>餐饮保险报价器正在初始化</main>;
}
```

创建 `src/app/globals.css`：

```css
@import "tailwindcss";

:root {
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #f7f9fc;
  color: #0f172a;
  font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
}
```

- [ ] **步骤 5：验证静态构建**

运行：

```powershell
pnpm lint
pnpm typecheck
pnpm build
Test-Path 'out\index.html'
```

预期：前三条命令成功，最后输出 `True`。

- [ ] **步骤 6：提交工程基线**

```powershell
git add package.json pnpm-lock.yaml next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs vitest.config.ts playwright.config.ts src
git commit -m "chore: scaffold static Next.js application"
```

---

### 任务 2：建立规则类型和运行时校验

**文件：**
- 创建：`src/features/quote/types.ts`
- 创建：`src/features/quote/schemas/quote-rules-schema.ts`
- 创建：`src/config/quote-rules.ts`
- 测试：`tests/unit/quote-rules-schema.test.ts`

- [ ] **步骤 1：先写规则校验失败测试**

创建 `tests/unit/quote-rules-schema.test.ts`：

```ts
import { describe, expect, test } from "vitest";
import rawRules from "../../docs/餐饮保险报价器-MVP规则.json";
import { quoteRulesSchema } from "@/features/quote/schemas/quote-rules-schema";

describe("quoteRulesSchema", () => {
  test("接受已确认的 mvp-1.1 规则", () => {
    expect(quoteRulesSchema.parse(rawRules).schema_version).toBe("mvp-1.1");
  });

  test("拒绝缺失基础保费的公众险方案", () => {
    const broken = structuredClone(rawRules);
    delete (broken.public_liability.plans.P1 as { base_premium_per_store?: number })
      .base_premium_per_store;
    expect(() => quoteRulesSchema.parse(broken)).toThrow();
  });

  test("拒绝未知的超界处理状态", () => {
    const broken = structuredClone(rawRules);
    broken.food_liability.area_bands[4].result = "UNKNOWN";
    expect(() => quoteRulesSchema.parse(broken)).toThrow();
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```powershell
pnpm test -- tests/unit/quote-rules-schema.test.ts
```

预期：失败，提示无法找到 `quote-rules-schema` 模块。

- [ ] **步骤 3：实现规则 schema 和公共类型**

创建 `src/features/quote/schemas/quote-rules-schema.ts`：

```ts
import { z } from "zod";

const areaBandSchema = z.union([
  z.object({
    min_exclusive: z.number(),
    max_exclusive: z.number(),
    factor: z.number().positive(),
  }),
  z.object({
    min_inclusive: z.number(),
    max_exclusive: z.number(),
    factor: z.number().positive(),
  }),
  z.object({
    min_inclusive: z.number(),
    max_exclusive: z.null(),
    result: z.literal("MANUAL_QUOTE"),
  }),
]);

const liabilityPlanSchema = z.object({
  aggregate_limit_10k: z.number().positive(),
  per_accident_limit_10k: z.number().positive(),
  per_person_limit_10k: z.number().positive(),
  per_person_medical_limit_10k: z.number().positive(),
  base_premium_per_store: z.number().positive(),
}).passthrough();

const roleRatesSchema = z.object({
  BACK_OFFICE_OR_CASHIER: z.number().positive(),
  WAITER: z.number().positive(),
  CHEF_OR_CLEANER: z.number().positive(),
});

const employerPlanSchema = z.object({
  death_disability_limit_10k_per_person: z.number().positive(),
  medical_limit_10k_per_person: z.number().positive(),
  annual_rate_by_role: roleRatesSchema,
});

export const quoteRulesSchema = z.object({
  schema_version: z.literal("mvp-1.1"),
  rule_status: z.literal("MVP_CONFIRMED"),
  currency: z.literal("CNY"),
  disclaimer: z.string().min(1),
  calculation_defaults: z.object({
    area_accepts_decimals: z.literal(true),
    area_rounding_before_band_match: z.literal("NONE"),
    final_rounding: z.literal("ROUND_HALF_UP_TO_YUAN"),
  }).passthrough(),
  public_liability: z.object({
    plans: z.record(z.enum(["P1", "P2", "P3", "P4"]), liabilityPlanSchema),
    area_bands: z.array(areaBandSchema).min(2),
    deductible: z.string().min(1),
  }).passthrough(),
  food_liability: z.object({
    plans: z.record(z.enum(["P1", "P2", "P3"]), liabilityPlanSchema),
    area_bands: z.array(areaBandSchema).min(2),
    deductible: z.string().min(1),
    food_production_license_required: z.literal(true),
  }).passthrough(),
  employers_liability: z.object({
    minimum_people_per_policy: z.literal(8),
    minimum_people_failure_result: z.literal("NOT_ELIGIBLE"),
    age_min_inclusive: z.literal(16),
    age_max_inclusive: z.literal(65),
    out_of_age_range_result: z.literal("MANUAL_QUOTE"),
    daily_lost_wage_benefit: z.number().positive(),
    plans: z.record(
      z.enum(["BASIC", "UPGRADED", "PREMIUM", "ULTIMATE"]),
      employerPlanSchema,
    ),
    medical_deductible: z.string().min(1),
    lost_wage_deductible: z.string().min(1),
  }).passthrough(),
}).passthrough();

export type QuoteRules = z.infer<typeof quoteRulesSchema>;
```

创建 `src/features/quote/types.ts`：

```ts
export const products = ["PUBLIC", "FOOD", "EMPLOYERS"] as const;
export type Product = (typeof products)[number];
export type PublicPlan = "P1" | "P2" | "P3" | "P4";
export type FoodPlan = "P1" | "P2" | "P3";
export type EmployerPlan = "BASIC" | "UPGRADED" | "PREMIUM" | "ULTIMATE";
export type EmployerRole = "BACK_OFFICE_OR_CASHIER" | "WAITER" | "CHEF_OR_CLEANER";
export type QuoteStatus =
  | "QUOTED"
  | "NOT_ELIGIBLE"
  | "MANUAL_QUOTE"
  | "PARTIAL_MANUAL"
  | "MISSING_INPUT";

export type QuoteInput = {
  products: Product[];
  area: number;
  publicPlan?: PublicPlan;
  foodPlan?: FoodPlan;
  employerPlan?: EmployerPlan;
  employeeCounts: Record<EmployerRole, number>;
  allEmployeesAgeEligible?: boolean;
};

export type QuoteItem = {
  product: Product;
  status: Exclude<QuoteStatus, "PARTIAL_MANUAL" | "MISSING_INPUT">;
  premium: number | null;
  reasonCode?: "AREA_LIMIT" | "MINIMUM_PEOPLE" | "AGE_RANGE";
  calculation: string | null;
};

export type QuoteResult = {
  status: QuoteStatus;
  ruleVersion: string;
  items: QuoteItem[];
  knownSubtotal: number | null;
  totalPremium: number | null;
};

export type QuoteStep = "STORE" | "EMPLOYER_PLAN" | "EMPLOYEES" | "LIABILITY_PLANS" | "RESULT";
```

创建 `src/config/quote-rules.ts`：

```ts
import rawRules from "../../docs/餐饮保险报价器-MVP规则.json";
import { quoteRulesSchema } from "@/features/quote/schemas/quote-rules-schema";

export const quoteRules = quoteRulesSchema.parse(rawRules);
```

- [ ] **步骤 4：运行测试确认通过**

运行：

```powershell
pnpm test -- tests/unit/quote-rules-schema.test.ts
pnpm typecheck
```

预期：3 个规则测试通过，类型检查通过。

- [ ] **步骤 5：提交规则层**

```powershell
git add src/config/quote-rules.ts src/features/quote tests/unit/quote-rules-schema.test.ts
git commit -m "feat: validate versioned quote rules"
```

---

### 任务 3：实现报价输入校验和动态步骤

**文件：**
- 创建：`src/features/quote/schemas/quote-input-schema.ts`
- 创建：`src/features/quote/state/quote-step-flow.ts`
- 测试：`tests/unit/quote-input-schema.test.ts`
- 测试：`tests/unit/quote-step-flow.test.ts`

- [ ] **步骤 1：写条件校验和步骤测试**

创建 `tests/unit/quote-input-schema.test.ts`：

```ts
import { expect, test } from "vitest";
import { quoteInputSchema } from "@/features/quote/schemas/quote-input-schema";

const emptyCounts = { BACK_OFFICE_OR_CASHIER: 0, WAITER: 0, CHEF_OR_CLEANER: 0 };

test("公众险需要公众险方案", () => {
  const result = quoteInputSchema.safeParse({ products: ["PUBLIC"], area: 260, employeeCounts: emptyCounts });
  expect(result.success).toBe(false);
});

test("雇主险需要档位和明确年龄答案", () => {
  const result = quoteInputSchema.safeParse({
    products: ["EMPLOYERS"],
    area: 260,
    employerPlan: "UPGRADED",
    employeeCounts: { ...emptyCounts, WAITER: 8 },
  });
  expect(result.success).toBe(false);
});

test("接受完整三险输入", () => {
  const result = quoteInputSchema.safeParse({
    products: ["PUBLIC", "FOOD", "EMPLOYERS"],
    area: 260,
    publicPlan: "P2",
    foodPlan: "P1",
    employerPlan: "UPGRADED",
    employeeCounts: { BACK_OFFICE_OR_CASHIER: 2, WAITER: 6, CHEF_OR_CLEANER: 4 },
    allEmployeesAgeEligible: true,
  });
  expect(result.success).toBe(true);
});
```

创建 `tests/unit/quote-step-flow.test.ts`：

```ts
import { expect, test } from "vitest";
import { getQuoteSteps } from "@/features/quote/state/quote-step-flow";

test("只选择公众险时流程收缩为三步", () => {
  expect(getQuoteSteps(["PUBLIC"])).toEqual(["STORE", "LIABILITY_PLANS", "RESULT"]);
});

test("只选择雇主险时包含档位和员工步骤", () => {
  expect(getQuoteSteps(["EMPLOYERS"])).toEqual(["STORE", "EMPLOYER_PLAN", "EMPLOYEES", "RESULT"]);
});

test("选择三险时显示完整五步", () => {
  expect(getQuoteSteps(["PUBLIC", "FOOD", "EMPLOYERS"])).toEqual([
    "STORE", "EMPLOYER_PLAN", "EMPLOYEES", "LIABILITY_PLANS", "RESULT",
  ]);
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```powershell
pnpm test -- tests/unit/quote-input-schema.test.ts tests/unit/quote-step-flow.test.ts
```

预期：失败，提示两个目标模块不存在。

- [ ] **步骤 3：实现输入 schema**

创建 `src/features/quote/schemas/quote-input-schema.ts`：

```ts
import { z } from "zod";

const productSchema = z.enum(["PUBLIC", "FOOD", "EMPLOYERS"]);
const countsSchema = z.object({
  BACK_OFFICE_OR_CASHIER: z.number().int().min(0, "人数不能小于 0"),
  WAITER: z.number().int().min(0, "人数不能小于 0"),
  CHEF_OR_CLEANER: z.number().int().min(0, "人数不能小于 0"),
});

export const quoteDraftSchema = z.object({
  products: z.array(productSchema).min(1, "请至少选择一个险种"),
  area: z.number().positive("请输入大于 0 的经营面积"),
  publicPlan: z.enum(["P1", "P2", "P3", "P4"]).optional(),
  foodPlan: z.enum(["P1", "P2", "P3"]).optional(),
  employerPlan: z.enum(["BASIC", "UPGRADED", "PREMIUM", "ULTIMATE"]).optional(),
  employeeCounts: countsSchema,
  allEmployeesAgeEligible: z.boolean().optional(),
});

export const quoteInputSchema = quoteDraftSchema.superRefine((value, context) => {
  if (value.products.includes("PUBLIC") && !value.publicPlan) {
    context.addIssue({ code: "custom", path: ["publicPlan"], message: "请选择公众责任险方案" });
  }
  if (value.products.includes("FOOD") && !value.foodPlan) {
    context.addIssue({ code: "custom", path: ["foodPlan"], message: "请选择食品安全责任险方案" });
  }
  if (value.products.includes("EMPLOYERS") && !value.employerPlan) {
    context.addIssue({ code: "custom", path: ["employerPlan"], message: "请选择雇主责任险档位" });
  }
  if (value.products.includes("EMPLOYERS") && value.allEmployeesAgeEligible === undefined) {
    context.addIssue({ code: "custom", path: ["allEmployeesAgeEligible"], message: "请确认员工年龄范围" });
  }
});
```

创建 `src/features/quote/state/quote-step-flow.ts`：

```ts
import type { Product, QuoteStep } from "@/features/quote/types";

export function getQuoteSteps(products: Product[]): QuoteStep[] {
  const steps: QuoteStep[] = ["STORE"];
  if (products.includes("EMPLOYERS")) steps.push("EMPLOYER_PLAN", "EMPLOYEES");
  if (products.includes("PUBLIC") || products.includes("FOOD")) steps.push("LIABILITY_PLANS");
  steps.push("RESULT");
  return steps;
}
```

- [ ] **步骤 4：运行测试确认通过**

运行：

```powershell
pnpm test -- tests/unit/quote-input-schema.test.ts tests/unit/quote-step-flow.test.ts
```

预期：6 个测试通过。

- [ ] **步骤 5：提交输入与步骤模型**

```powershell
git add src/features/quote/schemas src/features/quote/state tests/unit
git commit -m "feat: define quote input and dynamic steps"
```

---

### 任务 4：实现公众险、食责险和金额舍入

**文件：**
- 创建：`src/features/quote/calculator/liability-by-area.ts`
- 创建：`src/features/quote/calculator/money.ts`
- 测试：`tests/unit/calculator.test.ts`

- [ ] **步骤 1：先写面积边界和文档示例测试**

创建 `tests/unit/calculator.test.ts`，先加入：

```ts
import { describe, expect, test } from "vitest";
import { quoteRules } from "@/config/quote-rules";
import { calculateLiabilityByArea } from "@/features/quote/calculator/liability-by-area";
import { roundCny } from "@/features/quote/calculator/money";

describe("面积责任险", () => {
  test.each([
    [99.99, 1], [100, 1.8], [499.99, 1.8], [500, 2.5],
    [999.99, 2.5], [1000, 3.5], [2999.99, 3.5],
  ])("公众险面积 %s 使用系数 %s", (area, factor) => {
    const item = calculateLiabilityByArea("PUBLIC", "P2", area, quoteRules);
    expect(item.premium).toBe(800 * factor);
  });

  test("公众险 3000 平方米转人工报价", () => {
    expect(calculateLiabilityByArea("PUBLIC", "P2", 3000, quoteRules)).toMatchObject({
      status: "MANUAL_QUOTE", premium: null, reasonCode: "AREA_LIMIT",
    });
  });

  test.each([
    [99.99, 0.8], [100, 1.5], [499.99, 1.5], [500, 2.4],
    [999.99, 2.4], [1000, 3.6], [1999.99, 3.6],
  ])("食责险面积 %s 使用系数 %s", (area, factor) => {
    const item = calculateLiabilityByArea("FOOD", "P3", area, quoteRules);
    expect(item.premium).toBe(2000 * factor);
  });

  test("食责险 2000 平方米转人工报价", () => {
    expect(calculateLiabilityByArea("FOOD", "P1", 2000, quoteRules).status).toBe("MANUAL_QUOTE");
  });
});

test("人民币最终展示按半入规则取整", () => {
  expect(roundCny(100.49)).toBe(100);
  expect(roundCny(100.5)).toBe(101);
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```powershell
pnpm test -- tests/unit/calculator.test.ts
```

预期：失败，提示计算模块不存在。

- [ ] **步骤 3：实现面积匹配和舍入**

创建 `src/features/quote/calculator/liability-by-area.ts`：

```ts
import type { QuoteRules } from "@/features/quote/schemas/quote-rules-schema";
import type { FoodPlan, Product, PublicPlan, QuoteItem } from "@/features/quote/types";

type LiabilityProduct = Extract<Product, "PUBLIC" | "FOOD">;

export function calculateLiabilityByArea(
  product: LiabilityProduct,
  plan: PublicPlan | FoodPlan,
  area: number,
  rules: QuoteRules,
): QuoteItem {
  const section = product === "PUBLIC" ? rules.public_liability : rules.food_liability;
  const basePremium = product === "PUBLIC"
    ? rules.public_liability.plans[plan as PublicPlan].base_premium_per_store
    : rules.food_liability.plans[plan as FoodPlan].base_premium_per_store;
  const band = section.area_bands.find((candidate) => {
    const aboveMin = "min_exclusive" in candidate
      ? area > candidate.min_exclusive
      : area >= candidate.min_inclusive;
    const belowMax = candidate.max_exclusive === null || area < candidate.max_exclusive;
    return aboveMin && belowMax;
  });

  if (!band || "result" in band) {
    return { product, status: "MANUAL_QUOTE", premium: null, reasonCode: "AREA_LIMIT", calculation: null };
  }

  const premium = basePremium * band.factor;
  return {
    product,
    status: "QUOTED",
    premium,
    calculation: `${basePremium} × ${band.factor}`,
  };
}
```

创建 `src/features/quote/calculator/money.ts`：

```ts
export function roundCny(value: number): number {
  return Math.floor(value + 0.5);
}

export function formatCny(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(roundCny(value));
}
```

- [ ] **步骤 4：运行面积测试确认通过**

运行：

```powershell
pnpm test -- tests/unit/calculator.test.ts
```

预期：面积边界和舍入测试全部通过。

- [ ] **步骤 5：提交面积报价器**

```powershell
git add src/features/quote/calculator tests/unit/calculator.test.ts
git commit -m "feat: calculate liability premiums by area"
```

---

### 任务 5：实现雇主险和整体状态聚合

**文件：**
- 创建：`src/features/quote/calculator/employers-liability.ts`
- 创建：`src/features/quote/calculator/calculate-quote.ts`
- 修改：`tests/unit/calculator.test.ts`

- [ ] **步骤 1：补充雇主险和汇总失败测试**

在 `tests/unit/calculator.test.ts` 追加：

```ts
import { calculateEmployersLiability } from "@/features/quote/calculator/employers-liability";
import { calculateQuote } from "@/features/quote/calculator/calculate-quote";

const counts = { BACK_OFFICE_OR_CASHIER: 2, WAITER: 6, CHEF_OR_CLEANER: 4 };

describe("雇主责任险", () => {
  test("7 人不符合承保条件", () => {
    const item = calculateEmployersLiability(
      "UPGRADED",
      { BACK_OFFICE_OR_CASHIER: 1, WAITER: 3, CHEF_OR_CLEANER: 3 },
      true,
      quoteRules,
    );
    expect(item).toMatchObject({ status: "NOT_ELIGIBLE", premium: null, reasonCode: "MINIMUM_PEOPLE" });
  });

  test("8 人进入自动报价", () => {
    const item = calculateEmployersLiability(
      "BASIC",
      { BACK_OFFICE_OR_CASHIER: 0, WAITER: 8, CHEF_OR_CLEANER: 0 },
      true,
      quoteRules,
    );
    expect(item.premium).toBe(448);
  });

  test("年龄不符合时转人工报价", () => {
    expect(calculateEmployersLiability("UPGRADED", counts, false, quoteRules).status).toBe("MANUAL_QUOTE");
  });

  test("设计正常路径雇主险为 1344 元", () => {
    expect(calculateEmployersLiability("UPGRADED", counts, true, quoteRules).premium).toBe(1344);
  });
});

describe("整体报价", () => {
  test("设计正常路径总价为 3984 元", () => {
    const result = calculateQuote({
      products: ["PUBLIC", "FOOD", "EMPLOYERS"], area: 260,
      publicPlan: "P2", foodPlan: "P1", employerPlan: "UPGRADED",
      employeeCounts: counts, allEmployeesAgeEligible: true,
    }, quoteRules);
    expect(result).toMatchObject({ status: "QUOTED", knownSubtotal: 3984, totalPremium: 3984 });
  });

  test("规则文档示例总价为 5432 元", () => {
    const result = calculateQuote({
      products: ["PUBLIC", "FOOD", "EMPLOYERS"], area: 350,
      publicPlan: "P2", foodPlan: "P3", employerPlan: "UPGRADED",
      employeeCounts: { BACK_OFFICE_OR_CASHIER: 2, WAITER: 4, CHEF_OR_CLEANER: 3 },
      allEmployeesAgeEligible: true,
    }, quoteRules);
    expect(result.totalPremium).toBe(5432);
  });

  test("食责险超面积时保留其他险种小计但不显示最终总价", () => {
    const result = calculateQuote({
      products: ["PUBLIC", "FOOD"], area: 2500, publicPlan: "P1", foodPlan: "P1",
      employeeCounts: { BACK_OFFICE_OR_CASHIER: 0, WAITER: 0, CHEF_OR_CLEANER: 0 },
    }, quoteRules);
    expect(result).toMatchObject({ status: "PARTIAL_MANUAL", knownSubtotal: 2100, totalPremium: null });
  });
});
```

- [ ] **步骤 2：运行测试确认新增用例失败**

运行：

```powershell
pnpm test -- tests/unit/calculator.test.ts
```

预期：已有面积测试通过，新增测试因模块不存在而失败。

- [ ] **步骤 3：实现雇主险计算**

创建 `src/features/quote/calculator/employers-liability.ts`：

```ts
import type { QuoteRules } from "@/features/quote/schemas/quote-rules-schema";
import type { EmployerPlan, EmployerRole, QuoteItem } from "@/features/quote/types";

export function calculateEmployersLiability(
  plan: EmployerPlan,
  counts: Record<EmployerRole, number>,
  allEmployeesAgeEligible: boolean,
  rules: QuoteRules,
): QuoteItem {
  const totalPeople = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (totalPeople < rules.employers_liability.minimum_people_per_policy) {
    return { product: "EMPLOYERS", status: "NOT_ELIGIBLE", premium: null, reasonCode: "MINIMUM_PEOPLE", calculation: null };
  }
  if (!allEmployeesAgeEligible) {
    return { product: "EMPLOYERS", status: "MANUAL_QUOTE", premium: null, reasonCode: "AGE_RANGE", calculation: null };
  }
  const rates = rules.employers_liability.plans[plan].annual_rate_by_role;
  const premium = Object.entries(counts).reduce(
    (sum, [role, count]) => sum + rates[role as EmployerRole] * count,
    0,
  );
  return {
    product: "EMPLOYERS",
    status: "QUOTED",
    premium,
    calculation: `${counts.BACK_OFFICE_OR_CASHIER}×${rates.BACK_OFFICE_OR_CASHIER} + ${counts.WAITER}×${rates.WAITER} + ${counts.CHEF_OR_CLEANER}×${rates.CHEF_OR_CLEANER}`,
  };
}
```

- [ ] **步骤 4：实现整体聚合**

创建 `src/features/quote/calculator/calculate-quote.ts`：

```ts
import { calculateEmployersLiability } from "./employers-liability";
import { calculateLiabilityByArea } from "./liability-by-area";
import type { QuoteRules } from "@/features/quote/schemas/quote-rules-schema";
import type { QuoteInput, QuoteItem, QuoteResult } from "@/features/quote/types";

export function calculateQuote(input: QuoteInput, rules: QuoteRules): QuoteResult {
  const items: QuoteItem[] = [];
  if (input.products.includes("PUBLIC") && input.publicPlan) {
    items.push(calculateLiabilityByArea("PUBLIC", input.publicPlan, input.area, rules));
  }
  if (input.products.includes("FOOD") && input.foodPlan) {
    items.push(calculateLiabilityByArea("FOOD", input.foodPlan, input.area, rules));
  }
  if (input.products.includes("EMPLOYERS") && input.employerPlan && input.allEmployeesAgeEligible !== undefined) {
    items.push(calculateEmployersLiability(
      input.employerPlan,
      input.employeeCounts,
      input.allEmployeesAgeEligible,
      rules,
    ));
  }
  if (items.length !== input.products.length) {
    return { status: "MISSING_INPUT", ruleVersion: rules.schema_version, items, knownSubtotal: null, totalPremium: null };
  }
  const quoted = items.filter((item) => item.status === "QUOTED");
  const knownSubtotal = quoted.length > 0
    ? quoted.reduce((sum, item) => sum + (item.premium ?? 0), 0)
    : null;
  if (items.some((item) => item.status === "NOT_ELIGIBLE")) {
    return { status: "NOT_ELIGIBLE", ruleVersion: rules.schema_version, items, knownSubtotal, totalPremium: null };
  }
  const manualCount = items.filter((item) => item.status === "MANUAL_QUOTE").length;
  if (manualCount === items.length) {
    return { status: "MANUAL_QUOTE", ruleVersion: rules.schema_version, items, knownSubtotal: null, totalPremium: null };
  }
  if (manualCount > 0) {
    return { status: "PARTIAL_MANUAL", ruleVersion: rules.schema_version, items, knownSubtotal, totalPremium: null };
  }
  return { status: "QUOTED", ruleVersion: rules.schema_version, items, knownSubtotal, totalPremium: knownSubtotal };
}
```

- [ ] **步骤 5：运行完整计算测试**

运行：

```powershell
pnpm test -- tests/unit/calculator.test.ts
pnpm typecheck
```

预期：所有面积、人数、年龄、3984 元、5432 元和部分报价测试通过。

- [ ] **步骤 6：提交报价引擎**

```powershell
git add src/features/quote/calculator tests/unit/calculator.test.ts
git commit -m "feat: calculate employer and aggregate quotes"
```

---

### 任务 6：实现版本化会话草稿

**文件：**
- 创建：`src/features/quote/state/quote-draft-storage.ts`
- 测试：`tests/unit/draft-storage.test.ts`

- [ ] **步骤 1：写草稿读写和损坏恢复测试**

创建 `tests/unit/draft-storage.test.ts`：

```ts
// @vitest-environment jsdom
import { beforeEach, expect, test } from "vitest";
import { clearQuoteDraft, loadQuoteDraft, saveQuoteDraft } from "@/features/quote/state/quote-draft-storage";
import type { QuoteInput } from "@/features/quote/types";

const draft: QuoteInput = {
  products: ["PUBLIC"],
  area: 260,
  publicPlan: "P2",
  employeeCounts: { BACK_OFFICE_OR_CASHIER: 0, WAITER: 0, CHEF_OR_CLEANER: 0 },
};

beforeEach(() => sessionStorage.clear());

test("保存并恢复同规则版本草稿", () => {
  saveQuoteDraft(draft);
  expect(loadQuoteDraft()).toMatchObject({ area: 260, publicPlan: "P2" });
});

test("损坏草稿返回 null 并自动清除", () => {
  sessionStorage.setItem("restaurant-quote:draft:v1", "broken-json");
  expect(loadQuoteDraft()).toBeNull();
  expect(sessionStorage.length).toBe(0);
});

test("可以主动清除草稿", () => {
  saveQuoteDraft(draft);
  clearQuoteDraft();
  expect(loadQuoteDraft()).toBeNull();
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```powershell
pnpm test -- tests/unit/draft-storage.test.ts
```

预期：失败，提示草稿模块不存在。

- [ ] **步骤 3：实现草稿模块**

创建 `src/features/quote/state/quote-draft-storage.ts`：

```ts
import { quoteDraftSchema } from "@/features/quote/schemas/quote-input-schema";
import type { QuoteInput } from "@/features/quote/types";

const STORAGE_KEY = "restaurant-quote:draft:v1";
const RULE_VERSION = "mvp-1.1";

type DraftEnvelope = {
  draftVersion: 1;
  ruleVersion: typeof RULE_VERSION;
  savedAt: string;
  values: QuoteInput;
};

export function saveQuoteDraft(values: QuoteInput): void {
  const envelope: DraftEnvelope = {
    draftVersion: 1,
    ruleVersion: RULE_VERSION,
    savedAt: new Date().toISOString(),
    values,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

export function loadQuoteDraft(): QuoteInput | null {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const envelope = JSON.parse(stored) as Partial<DraftEnvelope>;
    if (envelope.draftVersion !== 1 || envelope.ruleVersion !== RULE_VERSION) throw new Error("version mismatch");
    return quoteDraftSchema.parse(envelope.values);
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearQuoteDraft(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **步骤 4：运行测试确认通过**

运行：

```powershell
pnpm test -- tests/unit/draft-storage.test.ts
```

预期：3 个草稿测试通过。

- [ ] **步骤 5：提交草稿模块**

```powershell
git add src/features/quote/state/quote-draft-storage.ts tests/unit/draft-storage.test.ts
git commit -m "feat: persist versioned quote drafts"
```

---

### 任务 7：建立视觉令牌、页面外壳和首个浏览器测试

**文件：**
- 修改：`src/app/globals.css`
- 修改：`src/app/layout.tsx`
- 创建：`src/features/quote/components/quote-shell.tsx`
- 测试：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写首页可访问性烟雾测试**

创建 `tests/e2e/quote-flow.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("显示报价器标题和第一步", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "餐饮门店保费智能预估" })).toBeVisible();
  await expect(page.getByText("门店与险种", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "下一步" })).toBeVisible();
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```powershell
pnpm test:e2e -- --project=chromium-mobile --grep "显示报价器标题"
```

预期：失败，因为当前页面只有初始化文字。

- [ ] **步骤 3：实现设计令牌和外壳组件**

在 `src/app/globals.css` 中定义并使用：

```css
@import "tailwindcss";

:root {
  --color-navy: #173a63;
  --color-ink: #0f172a;
  --color-muted: #51627a;
  --color-line: #cbd8e8;
  --color-surface: #ffffff;
  --color-page: #f7f9fc;
  --color-info: #e9eff8;
  --color-success: #10aa50;
  --radius-card: 16px;
}

* { box-sizing: border-box; }
html { background: var(--color-page); }
body {
  margin: 0;
  background: var(--color-page);
  color: var(--color-ink);
  font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
}
button, input { font: inherit; }
button:focus-visible, input:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-success) 45%, transparent);
  outline-offset: 2px;
}
.quote-page { min-height: 100dvh; padding: 32px 20px 128px; }
.quote-container { width: min(100%, 680px); margin: 0 auto; }
.quote-card {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 20px;
}
.sticky-action {
  position: fixed;
  inset: auto 0 0;
  padding: 16px max(20px, env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
  border-top: 1px solid var(--color-line);
  background: rgb(255 255 255 / 96%);
}
.primary-button {
  min-height: 52px;
  border: 0;
  border-radius: 999px;
  background: var(--color-success);
  color: white;
  font-weight: 700;
  padding: 0 28px;
}
```

创建 `src/features/quote/components/quote-shell.tsx`：

```tsx
import type { ReactNode } from "react";

type QuoteShellProps = {
  title: string;
  subtitle?: string;
  current: number;
  total: number;
  stepLabel: string;
  children: ReactNode;
  footer: ReactNode;
};

export function QuoteShell({ title, subtitle, current, total, stepLabel, children, footer }: QuoteShellProps) {
  return (
    <main className="quote-page">
      <div className="quote-container">
        <header>
          <p className="text-lg font-bold text-[var(--color-navy)]">餐饮安心保</p>
          <h1 className="mt-8 text-3xl font-extrabold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-3 leading-7 text-[var(--color-muted)]">{subtitle}</p> : null}
          <div className="mt-7 flex justify-between font-bold text-[var(--color-navy)]">
            <span>第 {current} 步 / 共 {total} 步 · {stepLabel}</span><span>{Math.round(current / total * 100)}%</span>
          </div>
          <progress className="mt-2 w-full" value={current} max={total} aria-label="报价进度" />
        </header>
        <section className="mt-10">{children}</section>
      </div>
      <footer className="sticky-action"><div className="quote-container">{footer}</div></footer>
    </main>
  );
}
```

- [ ] **步骤 4：暂时让首页使用外壳并满足烟雾测试**

修改 `src/app/page.tsx`：

```tsx
import { QuoteShell } from "@/features/quote/components/quote-shell";

export default function HomePage() {
  return (
    <QuoteShell
      title="餐饮门店保费智能预估"
      subtitle="填写餐饮门店经营信息，获取三类责任险的预估保费。"
      current={1}
      total={5}
      stepLabel="门店与险种"
      footer={<button className="primary-button w-full" type="button">下一步</button>}
    >
      <div className="quote-card">报价表单将在这里显示</div>
    </QuoteShell>
  );
}
```

- [ ] **步骤 5：运行烟雾测试和构建**

运行：

```powershell
pnpm test:e2e -- --project=chromium-mobile --grep "显示报价器标题"
pnpm build
```

预期：烟雾测试通过，`out/index.html` 生成。

- [ ] **步骤 6：提交视觉基础**

```powershell
git add src/app src/features/quote/components/quote-shell.tsx tests/e2e/quote-flow.spec.ts
git commit -m "feat: add mobile quote shell"
```

---

### 任务 8：实现险种、方案和员工输入组件

**文件：**
- 创建：`src/features/quote/components/product-selector.tsx`
- 创建：`src/features/quote/components/plan-selector.tsx`
- 创建：`src/features/quote/components/employee-count-input.tsx`
- 创建：`src/features/quote/steps/store-and-products-step.tsx`
- 创建：`src/features/quote/steps/employer-plan-step.tsx`
- 创建：`src/features/quote/steps/employee-info-step.tsx`
- 创建：`src/features/quote/steps/liability-plans-step.tsx`
- 修改：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写三险输入流程测试**

在 `tests/e2e/quote-flow.spec.ts` 追加：

```ts
test("可以录入三险正常路径", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await page.getByLabel("雇主责任险").check();
  await page.getByLabel("公众责任险").check();
  await page.getByLabel("食品安全责任险").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("升级版").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("内勤 / 收银人数").fill("2");
  await page.getByLabel("服务员人数").fill("6");
  await page.getByLabel("厨师 / 保洁人数").fill("4");
  await page.getByLabel("是，全部符合").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P2").check();
  await page.getByLabel("食品安全责任险方案一").check();
  await page.getByRole("button", { name: "查看报价" }).click();
  await expect(page.getByText("¥3,984", { exact: false })).toBeVisible();
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```powershell
pnpm test:e2e -- --project=chromium-mobile --grep "录入三险"
```

预期：失败，找不到“经营面积”输入。

- [ ] **步骤 3：实现三个通用输入组件**

`product-selector.tsx` 使用原生复选框和可点击标签，导出属性：

```tsx
import type { Product } from "@/features/quote/types";

const options: { value: Product; label: string; description: string }[] = [
  { value: "EMPLOYERS", label: "雇主责任险", description: "员工工伤、误工费用等，8 人起保" },
  { value: "PUBLIC", label: "公众责任险", description: "顾客在店内受伤、财物损失等第三者责任" },
  { value: "FOOD", label: "食品安全责任险", description: "食品安全事故赔偿责任" },
];

export function ProductSelector({ value, onChange, error }: {
  value: Product[];
  onChange: (value: Product[]) => void;
  error?: string;
}) {
  return <fieldset className="quote-card"><legend className="text-xl font-bold">选择险种（可多选）</legend>
    <div className="mt-4 grid gap-3">{options.map((option) => <label key={option.value} className="flex gap-3 rounded-2xl border border-[var(--color-line)] p-4">
      <input type="checkbox" aria-label={option.label} checked={value.includes(option.value)} onChange={(event) => onChange(event.target.checked ? [...value, option.value] : value.filter((item) => item !== option.value))} />
      <span><strong className="block">{option.label}</strong><span className="text-sm text-[var(--color-muted)]">{option.description}</span></span>
    </label>)}</div>
    {error ? <p role="alert" className="mt-3 text-red-700">{error}</p> : null}
  </fieldset>;
}
```

创建 `plan-selector.tsx`：

```tsx
export type PlanOption<T extends string> = {
  value: T;
  label: string;
  description: string;
  price: string;
};

export function PlanSelector<T extends string>({ legend, value, options, onChange, error }: {
  legend: string;
  value?: T;
  options: PlanOption<T>[];
  onChange: (value: T) => void;
  error?: string;
}) {
  return <fieldset className="quote-card"><legend className="text-xl font-bold">{legend}</legend>
    <div className="mt-4 grid gap-3">{options.map((option) => <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--color-line)] p-4">
      <input type="radio" name={legend} aria-label={option.label} checked={value === option.value} onChange={() => onChange(option.value)} />
      <span className="flex-1"><strong className="block">{option.label}</strong><span className="block text-sm text-[var(--color-muted)]">{option.description}</span><span className="mt-1 block font-bold text-[var(--color-navy)]">{option.price}</span></span>
    </label>)}</div>
    {error ? <p role="alert" className="mt-3 text-red-700">{error}</p> : null}
  </fieldset>;
}
```

创建 `employee-count-input.tsx`：

```tsx
export function EmployeeCountInput({ inputId, label, value, rate, onChange }: {
  inputId: string;
  label: string;
  value: number;
  rate: number;
  onChange: (value: number) => void;
}) {
  return <div className="flex items-center justify-between gap-4 py-3">
    <label className="font-bold" htmlFor={inputId}><span className="block">{label}</span><span className="text-sm font-normal text-[var(--color-muted)]">¥{rate} / 人 / 年</span></label>
    <div className="flex items-center rounded-xl bg-[var(--color-info)]">
      <button type="button" aria-label={`减少${label}人数`} onClick={() => onChange(Math.max(0, value - 1))} className="min-h-11 min-w-11">−</button>
      <input id={inputId} aria-label={`${label}人数`} type="number" inputMode="numeric" min={0} step={1} value={value} onChange={(event) => onChange(Math.max(0, Number.parseInt(event.target.value || "0", 10)))} className="w-16 bg-transparent text-center" />
      <button type="button" aria-label={`增加${label}人数`} onClick={() => onChange(value + 1)} className="min-h-11 min-w-11">＋</button>
    </div>
  </div>;
}
```

- [ ] **步骤 4：实现四个步骤组件**

创建 `store-and-products-step.tsx`：

```tsx
import { Controller, useFormContext } from "react-hook-form";
import { ProductSelector } from "../components/product-selector";
import type { QuoteInput } from "../types";

export function StoreAndProductsStep() {
  const { register, control, formState: { errors } } = useFormContext<QuoteInput>();
  return <div className="grid gap-5">
    <div className="quote-card"><label htmlFor="area" className="block text-lg font-bold">经营面积</label>
      <div className="mt-3 flex items-center gap-2"><input id="area" aria-label="经营面积" type="number" inputMode="decimal" min="0.01" step="0.01" className="w-full rounded-xl border border-[var(--color-line)] p-3" {...register("area", { valueAsNumber: true })} /><span>㎡</span></div>
      {errors.area?.message ? <p role="alert" className="mt-2 text-red-700">经营面积：{errors.area.message}</p> : null}
    </div>
    <Controller name="products" control={control} render={({ field }) => <ProductSelector value={field.value} onChange={field.onChange} error={errors.products?.message} />} />
  </div>;
}
```

创建 `employer-plan-step.tsx`：

```tsx
import { Controller, useFormContext } from "react-hook-form";
import { quoteRules } from "@/config/quote-rules";
import { PlanSelector, type PlanOption } from "../components/plan-selector";
import type { EmployerPlan, QuoteInput } from "../types";

const names: Record<EmployerPlan, string> = { BASIC: "基础版", UPGRADED: "升级版", PREMIUM: "尊享版", ULTIMATE: "臻享版" };
const options = (Object.keys(names) as EmployerPlan[]).map((value): PlanOption<EmployerPlan> => {
  const plan = quoteRules.employers_liability.plans[value];
  return { value, label: names[value], description: `每人伤亡 ${plan.death_disability_limit_10k_per_person} 万 · 每人医疗 ${plan.medical_limit_10k_per_person} 万`, price: "按岗位与人数计算" };
});

export function EmployerPlanStep() {
  const { control, formState: { errors } } = useFormContext<QuoteInput>();
  return <Controller name="employerPlan" control={control} render={({ field }) => <PlanSelector legend="选择雇主责任险档位" value={field.value} options={options} onChange={field.onChange} error={errors.employerPlan?.message} />} />;
}
```

创建 `employee-info-step.tsx`：

```tsx
import { Controller, useFormContext } from "react-hook-form";
import { quoteRules } from "@/config/quote-rules";
import { EmployeeCountInput } from "../components/employee-count-input";
import type { EmployerRole, QuoteInput } from "../types";

const roles: { value: EmployerRole; label: string }[] = [
  { value: "BACK_OFFICE_OR_CASHIER", label: "内勤 / 收银" },
  { value: "WAITER", label: "服务员" },
  { value: "CHEF_OR_CLEANER", label: "厨师 / 保洁" },
];

export function EmployeeInfoStep() {
  const { control, watch, formState: { errors } } = useFormContext<QuoteInput>();
  const plan = watch("employerPlan") ?? "BASIC";
  const rates = quoteRules.employers_liability.plans[plan].annual_rate_by_role;
  return <div className="grid gap-5"><div className="quote-card"><h2 className="text-xl font-bold">按岗位录入人数</h2>
    {roles.map((role) => <Controller key={role.value} name={`employeeCounts.${role.value}`} control={control} render={({ field }) => <EmployeeCountInput inputId={`count-${role.value}`} label={role.label} rate={rates[role.value]} value={field.value} onChange={field.onChange} />} />)}
  </div><Controller name="allEmployeesAgeEligible" control={control} render={({ field }) => <fieldset className="quote-card"><legend className="font-bold">所有参保员工是否均在 16—65 周岁范围内？</legend>
    <label className="mt-4 flex gap-2"><input type="radio" aria-label="是，全部符合" checked={field.value === true} onChange={() => field.onChange(true)} />是，全部符合</label>
    <label className="mt-3 flex gap-2"><input type="radio" aria-label="否，存在范围外员工" checked={field.value === false} onChange={() => field.onChange(false)} />否，存在范围外员工</label>
    {errors.allEmployeesAgeEligible?.message ? <p role="alert" className="mt-3 text-red-700">{errors.allEmployeesAgeEligible.message}</p> : null}
  </fieldset>} /></div>;
}
```

创建 `liability-plans-step.tsx`：

```tsx
import { Controller, useFormContext } from "react-hook-form";
import { quoteRules } from "@/config/quote-rules";
import { PlanSelector, type PlanOption } from "../components/plan-selector";
import type { FoodPlan, PublicPlan, QuoteInput } from "../types";

const publicOptions = (["P1", "P2", "P3", "P4"] as PublicPlan[]).map((value): PlanOption<PublicPlan> => {
  const plan = quoteRules.public_liability.plans[value];
  return { value, label: `公众责任险方案 ${value}`, description: `累计 ${plan.aggregate_limit_10k} 万 · 每次事故 ${plan.per_accident_limit_10k} 万`, price: `¥${plan.base_premium_per_store} / 店 / 年` };
});
const foodNames: Record<FoodPlan, string> = { P1: "方案一", P2: "方案二", P3: "方案三" };
const foodOptions = (["P1", "P2", "P3"] as FoodPlan[]).map((value): PlanOption<FoodPlan> => {
  const plan = quoteRules.food_liability.plans[value];
  return { value, label: `食品安全责任险${foodNames[value]}`, description: `累计 ${plan.aggregate_limit_10k} 万 · 每人 ${plan.per_person_limit_10k} 万`, price: `¥${plan.base_premium_per_store} / 店 / 年` };
});

export function LiabilityPlansStep() {
  const { control, watch, formState: { errors } } = useFormContext<QuoteInput>();
  const selected = watch("products");
  return <div className="grid gap-5">
    {selected.includes("PUBLIC") ? <Controller name="publicPlan" control={control} render={({ field }) => <PlanSelector legend="公众责任险" value={field.value} options={publicOptions} onChange={field.onChange} error={errors.publicPlan?.message} />} /> : null}
    {selected.includes("FOOD") ? <Controller name="foodPlan" control={control} render={({ field }) => <PlanSelector legend="食品安全责任险" value={field.value} options={foodOptions} onChange={field.onChange} error={errors.foodPlan?.message} />} /> : null}
  </div>;
}
```

- [ ] **步骤 5：运行类型检查**

运行：

```powershell
pnpm typecheck
pnpm lint
```

预期：无类型错误和 lint 错误。E2E 仍会失败，因为向导尚未编排，这是本任务的预期中间状态。

- [ ] **步骤 6：提交输入组件**

```powershell
git add src/features/quote/components src/features/quote/steps tests/e2e/quote-flow.spec.ts
git commit -m "feat: add quote input components"
```

---

### 任务 9：编排动态向导、条件校验和草稿恢复

**文件：**
- 创建：`src/features/quote/quote-wizard.tsx`
- 修改：`src/app/page.tsx`
- 修改：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：补充动态步骤和返回修改测试**

在 `tests/e2e/quote-flow.spec.ts` 追加：

```ts
test("只选择公众险时跳过雇主险步骤", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("100");
  await page.getByLabel("公众责任险").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await expect(page.getByText("第 2 步 / 共 3 步", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "公众与食责方案" })).toBeVisible();
});

test("必填错误阻止进入下一步", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "下一步" }).click();
  await expect(page.getByRole("alert")).toContainText(["经营面积", "险种"]);
});
```

- [ ] **步骤 2：运行新增测试确认失败**

运行：

```powershell
pnpm test:e2e -- --project=chromium-mobile --grep "跳过雇主险|必填错误"
```

预期：失败，因为首页尚未使用真实向导。

- [ ] **步骤 3：实现向导编排**

创建 `src/features/quote/quote-wizard.tsx`，必须实现以下确定行为：

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { quoteInputSchema } from "./schemas/quote-input-schema";
import { getQuoteSteps } from "./state/quote-step-flow";
import { loadQuoteDraft, saveQuoteDraft } from "./state/quote-draft-storage";
import { QuoteShell } from "./components/quote-shell";
import { StoreAndProductsStep } from "./steps/store-and-products-step";
import { EmployerPlanStep } from "./steps/employer-plan-step";
import { EmployeeInfoStep } from "./steps/employee-info-step";
import { LiabilityPlansStep } from "./steps/liability-plans-step";
import type { QuoteInput, QuoteStep } from "./types";

const defaults: QuoteInput = {
  products: [], area: 0,
  employeeCounts: { BACK_OFFICE_OR_CASHIER: 0, WAITER: 0, CHEF_OR_CLEANER: 0 },
};

const stepLabels: Record<QuoteStep, string> = {
  STORE: "门店与险种", EMPLOYER_PLAN: "雇主险档位", EMPLOYEES: "员工信息",
  LIABILITY_PLANS: "公众与食责方案", RESULT: "报价结果",
};

function fieldsForStep(step: QuoteStep, products: QuoteInput["products"]): FieldPath<QuoteInput>[] {
  if (step === "STORE") return ["area", "products"];
  if (step === "EMPLOYER_PLAN") return ["employerPlan"];
  if (step === "EMPLOYEES") return ["employeeCounts", "allEmployeesAgeEligible"];
  if (step === "LIABILITY_PLANS") {
    return [
      ...(products.includes("PUBLIC") ? ["publicPlan" as const] : []),
      ...(products.includes("FOOD") ? ["foodPlan" as const] : []),
    ];
  }
  return [];
}

export function QuoteWizard() {
  const methods = useForm<QuoteInput>({ resolver: zodResolver(quoteInputSchema), defaultValues: defaults, mode: "onTouched" });
  const products = methods.watch("products");
  const values = methods.watch();
  const steps = useMemo(() => getQuoteSteps(products), [products]);
  const [step, setStep] = useState<QuoteStep>("STORE");
  const index = Math.max(0, steps.indexOf(step));

  useEffect(() => {
    const draft = loadQuoteDraft();
    if (draft) methods.reset(draft);
  }, [methods]);

  useEffect(() => {
    if (products.length > 0 && values.area > 0) saveQuoteDraft(values as QuoteInput);
  }, [products.length, values]);

  useEffect(() => {
    if (!steps.includes(step)) setStep(steps[Math.max(0, steps.length - 2)]);
  }, [step, steps]);

  async function next() {
    const valid = await methods.trigger(fieldsForStep(step, products), { shouldFocus: true });
    if (!valid) return;
    setStep(steps[Math.min(index + 1, steps.length - 1)]);
  }

  function previous() {
    setStep(steps[Math.max(index - 1, 0)]);
  }

  const screen = step === "STORE" ? <StoreAndProductsStep />
    : step === "EMPLOYER_PLAN" ? <EmployerPlanStep />
    : step === "EMPLOYEES" ? <EmployeeInfoStep />
    : step === "LIABILITY_PLANS" ? <LiabilityPlansStep />
    : <div className="quote-card">报价结果正在生成</div>;

  return <FormProvider {...methods}><QuoteShell
    title={step === "STORE" ? "餐饮门店保费智能预估" : stepLabels[step]}
    current={index + 1} total={steps.length} stepLabel={stepLabels[step]}
    footer={<div className="flex gap-3">{index > 0 ? <button type="button" onClick={previous}>上一步</button> : null}{step !== "RESULT" ? <button className="primary-button ml-auto" type="button" onClick={next}>{steps[index + 1] === "RESULT" ? "查看报价" : "下一步"}</button> : null}</div>}
  >{screen}</QuoteShell></FormProvider>;
}
```

- [ ] **步骤 4：让首页只负责注入向导**

修改 `src/app/page.tsx`：

```tsx
import { QuoteWizard } from "@/features/quote/quote-wizard";

export default function HomePage() {
  return <QuoteWizard />;
}
```

- [ ] **步骤 5：运行动态流程测试**

运行：

```powershell
pnpm test:e2e -- --project=chromium-mobile --grep "跳过雇主险|必填错误"
```

预期：两个测试通过。

- [ ] **步骤 6：提交向导编排**

```powershell
git add src/app/page.tsx src/features/quote/quote-wizard.tsx tests/e2e/quote-flow.spec.ts
git commit -m "feat: orchestrate dynamic quote wizard"
```

---

### 任务 10：实现报价结果和销售联系扩展点

**文件：**
- 创建：`src/config/site.ts`
- 创建：`src/features/quote/components/sales-contact-action.tsx`
- 创建：`src/features/quote/components/quote-result-view.tsx`
- 创建：`src/features/quote/steps/quote-result-step.tsx`
- 修改：`src/features/quote/quote-wizard.tsx`
- 修改：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写正常、部分报价和不承保结果测试**

在 `tests/e2e/quote-flow.spec.ts` 增加三个独立测试：

```ts
test("正常结果展示最终总价和规则版本", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await page.getByLabel("公众责任险").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P2").check();
  await page.getByRole("button", { name: "查看报价" }).click();
  await expect(page.getByText("年度预估合计")).toBeVisible();
  await expect(page.getByText("¥1,440", { exact: false })).toBeVisible();
  await expect(page.getByText("mvp-1.1", { exact: false })).toBeVisible();
});

test("部分报价只展示已知小计", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("2500");
  await page.getByLabel("公众责任险").check();
  await page.getByLabel("食品安全责任险").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P1").check();
  await page.getByLabel("食品安全责任险方案一").check();
  await page.getByRole("button", { name: "查看报价" }).click();
  await expect(page.getByText("已知保费小计")).toBeVisible();
  await expect(page.getByText("¥2,100", { exact: false })).toBeVisible();
  await expect(page.getByText("最终总价待人工确认")).toBeVisible();
});

test("少于 8 人明确显示不承保", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("100");
  await page.getByLabel("雇主责任险").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("基础版").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("服务员人数").fill("7");
  await page.getByLabel("是，全部符合").check();
  await page.getByRole("button", { name: "查看报价" }).click();
  await expect(page.getByText("不符合承保条件")).toBeVisible();
  await expect(page.getByText("不转人工报价")).toBeVisible();
});
```

- [ ] **步骤 2：运行结果测试确认失败**

运行：

```powershell
pnpm test:e2e -- --project=chromium-mobile --grep "正常结果|部分报价|少于 8 人"
```

预期：失败，因为结果步骤尚未渲染计算结果。

- [ ] **步骤 3：实现公开联系配置**

创建 `src/config/site.ts`：

```ts
export type SalesContact = {
  sourceId: string;
  displayName: string;
  phone?: string;
  wechat?: string;
};

export const defaultSalesContact: SalesContact = {
  sourceId: "default",
  displayName: "餐饮安心保顾问",
};
```

创建 `sales-contact-action.tsx`：

```tsx
import type { SalesContact } from "@/config/site";

export function SalesContactAction({ contact }: { contact: SalesContact }) {
  if (contact.phone) {
    return <a className="primary-button flex items-center justify-center" href={`tel:${contact.phone}`}>联系{contact.displayName} · 确认方案</a>;
  }
  return <div className="rounded-2xl bg-[var(--color-info)] p-4 text-center"><strong>请联系销售确认方案</strong><p className="mt-1 text-sm text-[var(--color-muted)]">{contact.displayName}</p></div>;
}
```

- [ ] **步骤 4：实现结果视图**

创建 `quote-result-view.tsx`：

```tsx
import type { SalesContact } from "@/config/site";
import type { QuoteRules } from "../schemas/quote-rules-schema";
import type { Product, QuoteResult } from "../types";
import { formatCny } from "../calculator/money";
import { SalesContactAction } from "./sales-contact-action";

const productNames: Record<Product, string> = { PUBLIC: "公众责任险", FOOD: "食品安全责任险", EMPLOYERS: "雇主责任险" };

export function QuoteResultView({ result, rules, contact }: { result: QuoteResult; rules: QuoteRules; contact: SalesContact }) {
  const showsKnownSubtotal = (result.status === "PARTIAL_MANUAL" || result.status === "NOT_ELIGIBLE") && result.knownSubtotal !== null;
  const amountTitle = result.status === "QUOTED" ? "年度预估合计" : showsKnownSubtotal ? "已知保费小计" : null;
  const amount = result.status === "QUOTED" ? result.totalPremium : showsKnownSubtotal ? result.knownSubtotal : null;
  return <div className="grid gap-5">
    <section className="quote-card bg-[var(--color-navy)] text-white">
      {amountTitle ? <p>{amountTitle}</p> : null}
      {amount !== null ? <p className="mt-3 text-4xl font-extrabold">{formatCny(amount)} <span className="text-base">/ 年</span></p> : null}
      {result.status === "PARTIAL_MANUAL" ? <p className="mt-3">最终总价待人工确认</p> : null}
      {result.status === "MANUAL_QUOTE" ? <h2 className="text-2xl font-bold">需人工报价</h2> : null}
      {result.status === "NOT_ELIGIBLE" ? <><h2 className="text-2xl font-bold">不符合承保条件</h2><p className="mt-2">雇主责任险少于 8 人不承保，不转人工报价</p></> : null}
      {result.status === "MISSING_INPUT" ? <h2 className="text-2xl font-bold">报价信息不完整</h2> : null}
    </section>
    <section className="quote-card"><h2 className="text-xl font-bold">保费明细</h2><div className="mt-4 grid gap-4">{result.items.map((item) => <div key={item.product} className="border-b border-[var(--color-line)] pb-4 last:border-0">
      <div className="flex justify-between gap-4"><strong>{productNames[item.product]}</strong><strong>{item.premium === null ? item.status === "NOT_ELIGIBLE" ? "不承保" : "人工报价" : formatCny(item.premium)}</strong></div>
      {item.calculation ? <p className="mt-1 text-sm text-[var(--color-muted)]">{item.calculation}</p> : null}
    </div>)}</div></section>
    <section className="quote-card"><h2 className="text-xl font-bold">保障与免赔要点</h2><ul className="mt-3 list-disc space-y-2 pl-5"><li>公众 / 食责：{rules.public_liability.deductible}</li><li>雇主医疗：{rules.employers_liability.medical_deductible}</li><li>雇主误工：{rules.employers_liability.lost_wage_deductible}</li></ul></section>
    <section className="quote-card"><h2 className="text-xl font-bold">承保所需资料</h2><ul className="mt-3 list-disc space-y-2 pl-5"><li>营业执照（副本）</li><li>食品生产许可证（投食责险必需）</li><li>员工花名册（投雇主险时提供）</li></ul></section>
    <p className="text-sm text-[var(--color-muted)]">规则版本：{result.ruleVersion}。{rules.disclaimer}</p>
    <SalesContactAction contact={contact} />
  </div>;
}
```

- [ ] **步骤 5：连接报价计算**

创建 `quote-result-step.tsx`：

```tsx
import { useFormContext } from "react-hook-form";
import { quoteRules } from "@/config/quote-rules";
import { defaultSalesContact } from "@/config/site";
import { calculateQuote } from "../calculator/calculate-quote";
import { QuoteResultView } from "../components/quote-result-view";
import type { QuoteInput } from "../types";

export function QuoteResultStep() {
  const { getValues } = useFormContext<QuoteInput>();
  const result = calculateQuote(getValues(), quoteRules);
  return <QuoteResultView result={result} rules={quoteRules} contact={defaultSalesContact} />;
}
```

修改 `quote-wizard.tsx`：导入 `QuoteResultStep`，并把 RESULT 分支的“报价结果正在生成”替换为 `<QuoteResultStep />`。保留进入 RESULT 前的当前步骤校验，结果页不接受从客户端传入的金额属性。

- [ ] **步骤 6：运行结果测试和三险测试**

运行：

```powershell
pnpm test:e2e -- --project=chromium-mobile --grep "正常结果|部分报价|少于 8 人|录入三险"
```

预期：4 个测试通过。

- [ ] **步骤 7：提交结果展示**

```powershell
git add src/config/site.ts src/features/quote/components src/features/quote/steps src/features/quote/quote-wizard.tsx tests/e2e/quote-flow.spec.ts
git commit -m "feat: present quote outcomes and contact action"
```

---

### 任务 11：补齐返回修改、草稿恢复和移动端交互

**文件：**
- 修改：`src/features/quote/quote-wizard.tsx`
- 修改：`src/features/quote/components/quote-shell.tsx`
- 修改：`src/app/globals.css`
- 修改：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写刷新恢复和返回修改测试**

在 `tests/e2e/quote-flow.spec.ts` 追加：

```ts
test("刷新后恢复当前会话输入", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("350");
  await page.getByLabel("公众责任险").check();
  await page.reload();
  await expect(page.getByLabel("经营面积")).toHaveValue("350");
  await expect(page.getByLabel("公众责任险")).toBeChecked();
});

test("取消险种后不保留该险种方案", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await page.getByLabel("公众责任险").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P2").check();
  await page.getByRole("button", { name: "上一步" }).click();
  await page.getByLabel("公众责任险").uncheck();
  await page.getByLabel("食品安全责任险").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await expect(page.getByText("公众责任险", { exact: true })).toHaveCount(0);
});
```

- [ ] **步骤 2：运行测试确认至少一个失败**

运行：

```powershell
pnpm test:e2e -- --project=chromium-mobile --grep "恢复当前会话|取消险种"
```

预期：草稿恢复或下游清理尚不完整，测试失败。

- [ ] **步骤 3：清理被取消险种的下游值**

在 `quote-wizard.tsx` 中为 React 导入增加 `useRef`，为类型导入增加 `Product`，然后加入：

```tsx
const previousProducts = useRef<Product[]>([]);

useEffect(() => {
  const previous = previousProducts.current;
  if (previous.includes("PUBLIC") && !products.includes("PUBLIC")) methods.setValue("publicPlan", undefined);
  if (previous.includes("FOOD") && !products.includes("FOOD")) methods.setValue("foodPlan", undefined);
  if (previous.includes("EMPLOYERS") && !products.includes("EMPLOYERS")) {
    methods.setValue("employerPlan", undefined);
    methods.setValue("allEmployeesAgeEligible", undefined);
    methods.setValue("employeeCounts", { BACK_OFFICE_OR_CASHIER: 0, WAITER: 0, CHEF_OR_CLEANER: 0 });
  }
  previousProducts.current = products;
}, [methods, products]);
```

- [ ] **步骤 4：完善草稿恢复时机**

用以下两个 effect 替换任务 9 中的加载和保存 effect：

```tsx
const [hydrated, setHydrated] = useState(false);

useEffect(() => {
  const draft = loadQuoteDraft();
  if (draft) methods.reset(draft);
  setHydrated(true);
}, [methods]);

useEffect(() => {
  if (!hydrated) return;
  if (products.length > 0 && values.area > 0) saveQuoteDraft(values as QuoteInput);
}, [hydrated, products.length, values]);
```

删除旧的无 `hydrated` 保护的加载与保存 effect。恢复完成后从 STORE 开始展示，用户输入保持不变。

- [ ] **步骤 5：完善移动端交互**

在 `globals.css` 追加：

```css
button, input[type="checkbox"], input[type="radio"] { min-height: 44px; }
input[type="checkbox"], input[type="radio"] { min-width: 24px; accent-color: var(--color-success); }
progress { height: 8px; accent-color: var(--color-navy); }
@media (max-width: 390px) {
  .quote-page { padding-inline: 16px; }
  .quote-card { padding: 16px; }
}
```

保留 `trigger(fieldsForStep(step, products), { shouldFocus: true })`，由 React Hook Form 聚焦第一个无效字段。面积输入保持 `inputMode="decimal"`，人数输入保持 `inputMode="numeric"`，选择控件同时保留文字和原生选中状态。

- [ ] **步骤 6：运行恢复测试和两个移动浏览器项目**

运行：

```powershell
pnpm test:e2e -- --grep "恢复当前会话|取消险种"
```

预期：Chromium Mobile 和 WebKit Mobile 均通过。

- [ ] **步骤 7：提交交互完善**

```powershell
git add src/features/quote src/app/globals.css tests/e2e/quote-flow.spec.ts
git commit -m "feat: refine quote recovery and mobile flow"
```

---

### 任务 12：完成全量质量检查和交付说明

**文件：**
- 修改：`README.md`
- 创建：`docs/02-餐饮保险报价器-MVP开发与验收.md`

- [ ] **步骤 1：运行全部单元测试**

运行：

```powershell
pnpm test
```

预期：规则 schema、输入 schema、动态步骤、面积边界、人数边界、状态聚合和草稿测试全部通过。

- [ ] **步骤 2：运行全部浏览器测试**

运行：

```powershell
pnpm test:e2e
```

预期：Chromium Mobile 和 WebKit Mobile 的正常、跳步、错误、人工、部分、不承保、返回修改和刷新恢复路径全部通过。

- [ ] **步骤 3：执行静态构建和产物检查**

运行：

```powershell
pnpm lint
pnpm typecheck
pnpm build
Test-Path 'out\index.html'
rg -n "_next/image|vercel|netlify|cloudflare" out
```

预期：lint、类型检查和构建通过，`out/index.html` 存在；最后一条命令不应发现托管商专属运行时引用。若 `_next/image` 出现，检查是否意外使用默认图片优化。

- [ ] **步骤 4：用通用静态服务器验证构建产物**

运行：

```powershell
pnpm dlx serve out -l 4173
```

在另一个终端或浏览器访问 `http://127.0.0.1:4173`，完成一次三险 3,984 元路径和一次 2,500㎡ 部分报价路径。

预期：页面、字体、图标和报价流程不依赖 Next.js 运行时服务器。

- [ ] **步骤 5：编写开发与验收文档**

`docs/02-餐饮保险报价器-MVP开发与验收.md` 使用中文记录：

- 环境要求和 pnpm 命令。
- 规则版本 `mvp-1.1`。
- 静态构建和本地预览方式。
- 五类报价状态含义。
- 3,984 元和 5,432 元验收样例。
- 当前单门店限制。
- 员工配置、留资、数据库和管理后台属于后续阶段。
- Android/iOS 微信实机验收清单，不记录尚未执行的实机测试为通过。

同时更新 `README.md` 的当前状态和开发命令，不修改已确认业务规则。

- [ ] **步骤 6：运行最终检查**

运行：

```powershell
pnpm check
pnpm test:e2e
git diff --check
git status --short
```

预期：所有命令通过；`git status --short` 只列出本任务的 README 和验收文档改动。

- [ ] **步骤 7：提交交付文档**

```powershell
git add README.md docs/02-餐饮保险报价器-MVP开发与验收.md
git commit -m "docs: add MVP development and acceptance guide"
```

- [ ] **步骤 8：确认仓库最终状态**

运行：

```powershell
git status --short
git log --oneline --decorate -12
```

预期：工作区干净，提交历史按工程、规则、计算、表单、UI、结果、恢复和文档职责分批保存。

---

## 二、实施完成判定

只有同时满足以下条件，MVP 才算完成：

1. `pnpm check` 和 `pnpm test:e2e` 全部通过。
2. `out/index.html` 存在，使用通用静态服务器可完成报价。
3. 规则示例 5,432 元和设计正常路径 3,984 元均由自动化测试锁定。
4. 少于 8 人显示不承保且不转人工。
5. 年龄不合格、公众险超 3,000㎡、食责险超 2,000㎡进入人工报价。
6. 部分可报价时只显示已知小计，不显示最终总价。
7. 页面不提供多门店、员工专属路由、留资、数据库或后台能力。
8. UI 中不存在硬编码费率和面积边界。
9. Pencil、业务规则 Markdown 和规则 JSON 未被修改。
10. 仓库工作区干净，提交信息为英文且粒度清晰。

---

## 三、官方技术依据

- [Next.js 静态导出](https://nextjs.org/docs/app/guides/static-exports)：使用 `output: "export"`，由 `next build` 生成 `out/`。
- [Vitest 入门指南](https://vitest.dev/guide/)：使用 `vitest run` 执行一次性单元测试。
- [Playwright 安装与运行](https://playwright.dev/docs/intro)：使用 pnpm 安装浏览器并通过 `pnpm exec playwright test` 执行浏览器流程测试。
