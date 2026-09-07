# 报价结果页联系方式复制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在所有报价结果状态底部直接展示一个微信同号的演示手机号，并提供可靠的一键复制与可恢复反馈。

**Architecture:** 联系数据集中在 `src/config/site.ts`，独立 `SalesContactAction` 客户端组件负责号码格式化、剪贴板调用和反馈，`ResultStep` 只负责组合。优先使用 Clipboard API，局域网 HTTP 环境下回退到受控文本选择复制；报价规则和结果数据不变。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、CSS、Phosphor Icons、Playwright、Vitest、npm

---

## 文件结构

- 修改 `src/config/site.ts`：定义默认公开联系方式和类型。
- 创建 `src/features/quote/components/sales-contact-action.tsx`：渲染联系卡并处理复制行为。
- 修改 `src/features/quote/components/steps/result-step.tsx`：接入独立联系组件。
- 修改 `src/app/globals.css`：沿用现有视觉令牌，补足号码、标签、按钮和反馈样式。
- 修改 `tests/e2e/quote-flow.spec.ts`：覆盖展示、复制成功、回退和失败反馈。
- 修改 `tests/e2e/mobile-layout.spec.ts`：覆盖 360px 无溢出和 44px 触控高度。

## 任务 1：展示联系方式并实现 Clipboard API 成功路径

**文件：**

- 修改：`src/config/site.ts`
- 创建：`src/features/quote/components/sales-contact-action.tsx`
- 修改：`src/features/quote/components/steps/result-step.tsx`
- 修改：`src/app/globals.css`
- 测试：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写复制成功 E2E**

在 `tests/e2e/quote-flow.spec.ts` 增加：

```ts
test("结果页展示微信同号并可复制业务号码", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          window.sessionStorage.setItem("copied-contact-number", value);
        },
      },
    });
  });

  await page.goto("/");
  await completeThreeProductQuote(page);

  await expect(page.getByRole("heading", { name: "咨询业务人员" })).toBeVisible();
  await expect(page.getByText("138 0000 0000", { exact: true })).toBeVisible();
  await expect(page.getByText("微信同号", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "复制号码" }).click();
  await expect(page.getByRole("button", { name: "已复制" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("号码已复制，可打开微信添加");
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("copied-contact-number")))
    .toBe("13800000000");
});
```

在既有“少于 8 人”和“部分报价”测试的结果断言中分别增加：

```ts
await expect(page.getByRole("heading", { name: "咨询业务人员" })).toBeVisible();
```

再增加全人工报价状态：

```ts
test("人工报价结果也展示业务联系方式", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("3500");
  await chooseProducts(page, ["公众责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P1").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  await expect(page.getByRole("heading", { name: "需人工报价" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "咨询业务人员" })).toBeVisible();
});
```

- [ ] **步骤 2：运行测试并确认 RED**

运行：

```bash
npm run test:e2e -- --grep "结果页展示微信同号" --project=chromium-mobile --workers=1
```

预期：FAIL，找不到“咨询业务人员”、演示号码和“复制号码”按钮。

- [ ] **步骤 3：增加联系配置**

在 `src/config/site.ts` 增加，并删除不再使用的字符串字段 `siteConfig.salesContact`：

```ts
export type SalesContact = {
  displayName: string;
  phone: string;
  wechatSameAsPhone: boolean;
};

export const defaultSalesContact: SalesContact = {
  displayName: "咨询业务人员",
  phone: "13800000000",
  wechatSameAsPhone: true,
};
```

- [ ] **步骤 4：创建最小复制组件**

创建 `src/features/quote/components/sales-contact-action.tsx`：

```tsx
"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import type { SalesContact } from "@/config/site";

function formatMobileNumber(phone: string) {
  return phone.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1 $2 $3");
}

export function SalesContactAction({ contact }: { contact: SalesContact }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(contact.phone);
    setCopied(true);
  }

  return (
    <section className="sales-contact" aria-labelledby="sales-contact-title">
      <h2 id="sales-contact-title">{contact.displayName}</h2>
      <div className="contact-number-row">
        <span className="contact-number">{formatMobileNumber(contact.phone)}</span>
        {contact.wechatSameAsPhone ? <span className="contact-badge">微信同号</span> : null}
      </div>
      <button type="button" className="primary-button copy-contact-button" onClick={handleCopy}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? "已复制" : "复制号码"}
      </button>
      {copied ? <p className="contact-feedback" role="status">号码已复制，可打开微信添加</p> : null}
    </section>
  );
}
```

- [ ] **步骤 5：接入结果页并增加样式**

在 `result-step.tsx` 导入：

```tsx
import { defaultSalesContact } from "@/config/site";
import { SalesContactAction } from "../sales-contact-action";
```

用以下组件替换原 `.sales-contact` 静态区：

```tsx
<SalesContactAction contact={defaultSalesContact} />
```

在 `src/app/globals.css` 用以下样式替换旧联系卡规则：

```css
.sales-contact { display: grid; gap: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-card); padding: var(--space-3); background: var(--color-surface); }
.sales-contact h2 { color: var(--color-primary); }
.contact-number-row { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1); }
.contact-number { color: var(--color-text); font-size: 1.25rem; font-weight: 700; font-variant-numeric: tabular-nums; user-select: all; }
.contact-badge { border-radius: 999px; background: var(--color-soft); color: var(--color-primary); padding: 0.25rem 0.625rem; font-size: 0.8125rem; font-weight: 700; }
.copy-contact-button { width: 100%; margin-top: var(--space-1); }
.contact-feedback { margin: 0; color: var(--color-action); font-size: 0.875rem; line-height: 1.5; }
```

- [ ] **步骤 6：确认 GREEN 并提交**

运行：

```bash
npm run test:e2e -- --grep "结果页展示微信同号" --project=chromium-mobile --workers=1
npm run lint
npm run typecheck
```

预期：目标 E2E 1/1 通过，lint 和类型检查无错误。

提交：

```bash
git add src/config/site.ts src/features/quote/components/sales-contact-action.tsx src/features/quote/components/steps/result-step.tsx src/app/globals.css tests/e2e/quote-flow.spec.ts
git commit -m "feat: add copyable sales contact"
```

## 任务 2：增加 HTTP 回退和复制失败反馈

**文件：**

- 修改：`src/features/quote/components/sales-contact-action.tsx`
- 测试：`tests/e2e/quote-flow.spec.ts`

- [ ] **步骤 1：先写回退与失败 E2E**

增加两个测试。第一个删除 Clipboard API 并让 `execCommand` 成功：

```ts
test("Clipboard API 不可用时回退复制业务号码", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    Document.prototype.execCommand = (command: string) => {
      window.sessionStorage.setItem("fallback-copy-command", command);
      return command === "copy";
    };
  });
  await page.goto("/");
  await completeThreeProductQuote(page);
  await page.getByRole("button", { name: "复制号码" }).click();
  await expect(page.getByRole("status")).toHaveText("号码已复制，可打开微信添加");
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("fallback-copy-command")))
    .toBe("copy");
});
```

第二个让两个复制通道都失败：

```ts
test("复制业务号码失败时提供长按恢复提示", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => { throw new Error("denied"); } },
    });
    Document.prototype.execCommand = () => false;
  });
  await page.goto("/");
  await completeThreeProductQuote(page);
  await page.getByRole("button", { name: "复制号码" }).click();
  await expect(page.getByRole("status")).toHaveText("复制失败，请长按号码复制");
  await expect(page.getByText("138 0000 0000", { exact: true })).toBeVisible();
});
```

- [ ] **步骤 2：运行测试并确认 RED**

运行：

```bash
npm run test:e2e -- --grep "回退复制业务号码|复制业务号码失败" --project=chromium-mobile --workers=1
```

预期：回退测试因 `navigator.clipboard` 不存在而失败；失败测试因缺少恢复提示而失败。

- [ ] **步骤 3：实现回退和失败状态**

在 `sales-contact-action.tsx` 增加：

```tsx
type CopyState = "idle" | "success" | "error";

function fallbackCopyText(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy command failed");
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      fallbackCopyText(value);
      return;
    }
  }
  fallbackCopyText(value);
}
```

把布尔状态改为 `CopyState`，并将处理函数改为：

```tsx
const [copyState, setCopyState] = useState<CopyState>("idle");

async function handleCopy() {
  try {
    await copyText(contact.phone);
    setCopyState("success");
  } catch {
    setCopyState("error");
  }
}
```

按钮文字使用 `copyState === "success" ? "已复制" : "复制号码"`。按钮后渲染：

```tsx
{copyState !== "idle" ? (
  <p className="contact-feedback" data-state={copyState} role="status">
    {copyState === "success"
      ? "号码已复制，可打开微信添加"
      : "复制失败，请长按号码复制"}
  </p>
) : null}
```

补充错误颜色：

```css
.contact-feedback[data-state="error"] { color: var(--color-error); }
```

- [ ] **步骤 4：确认 GREEN 并提交**

运行：

```bash
npm run test:e2e -- --grep "结果页展示微信同号|回退复制业务号码|复制业务号码失败" --project=chromium-mobile --workers=1
npm run lint
npm run typecheck
```

预期：三个复制场景全部通过。

提交：

```bash
git add src/features/quote/components/sales-contact-action.tsx src/app/globals.css tests/e2e/quote-flow.spec.ts
git commit -m "fix: support contact copy fallback"
```

## 任务 3：移动端布局与完整验收

**文件：**

- 修改：`tests/e2e/mobile-layout.spec.ts`
- 修改：`src/app/globals.css`（仅在测试发现真实布局问题时）

- [ ] **步骤 1：先写移动端布局 E2E**

在 `tests/e2e/mobile-layout.spec.ts` 增加一个完成公众险报价的局部流程，并断言：

```ts
test("360px 结果页联系方式不溢出且复制按钮可触控", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await page.getByLabel("公众责任险", { exact: true }).check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P2").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(metrics.document).toBeLessThanOrEqual(metrics.viewport);

  const buttonHeight = await page.getByRole("button", { name: "复制号码" })
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(buttonHeight).toBeGreaterThanOrEqual(44);
});
```

- [ ] **步骤 2：运行移动端测试并处理真实失败**

运行：

```bash
npm run test:e2e -- --grep "360px 结果页联系方式" --project=chromium-mobile --workers=1
```

预期：测试通过；如出现真实溢出，仅调整 `.contact-number-row`、`.contact-number` 或 `.copy-contact-button`，不得缩小号码到 16px 以下或降低按钮高度。

- [ ] **步骤 3：执行完整验收**

运行：

```bash
npm run check
npm run test:e2e -- --workers=4
git diff --check
git status --short
```

预期：ESLint、TypeScript、60 项以上 Vitest、静态导出和三个移动端 Playwright 项目全部通过；工作区仅包含本任务尚未提交的测试或必要样式。

- [ ] **步骤 4：提交测试并检查提交历史**

如任务 3 产生文件变更：

```bash
git add tests/e2e/mobile-layout.spec.ts src/app/globals.css
git commit -m "test: verify mobile contact action"
```

最后运行：

```bash
git status --short --branch
git log -5 --oneline
```

预期：工作区干净，提交信息全部为英文。
