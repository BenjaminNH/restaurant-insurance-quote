import { expect, test, type Page } from "@playwright/test";

async function chooseProducts(
  page: Page,
  products: Array<"雇主责任险" | "公众责任险" | "食品安全责任险">,
) {
  for (const product of products) {
    await page.getByLabel(product, { exact: true }).check();
  }
}

async function completeThreeProductQuote(page: Page) {
  await page.getByLabel("经营面积").fill("260");
  await chooseProducts(page, ["雇主责任险", "公众责任险", "食品安全责任险"]);
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
}

test("显示紧凑进度、免责声明与移动端表单语义", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "餐饮门店保费智能预估" }),
  ).toBeVisible();
  await expect(page.getByText("第 1/2 步", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "报价进度" })).toHaveAttribute("aria-valuenow", "50");
  await expect(page.getByLabel("经营面积")).toHaveAttribute("inputmode", "decimal");
  await expect(page.getByRole("button", { name: "下一步" })).toBeVisible();
  await expect(page.getByText("预估保费仅供参考", { exact: false })).toBeVisible();
  await expect(page.getByText("→", { exact: true })).toHaveCount(0);
});

test("必填错误阻止进入下一步并聚焦首个错误字段", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "下一步" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "请完善" })).toContainText("经营面积");
  await expect(page.getByRole("alert").filter({ hasText: "请完善" })).toContainText("险种");
  await expect(page.getByLabel("经营面积")).toBeFocused();
});

test("只选择公众险时跳过雇主险步骤并得到正常报价", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await chooseProducts(page, ["公众责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();

  await expect(page.getByText("第 2 步 / 共 3 步", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "公众与食责方案" })).toBeVisible();
  await page.getByLabel("公众责任险方案 P2").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  await expect(page.getByText("年度预估合计")).toBeVisible();
  await expect(page.locator(".total-amount")).toContainText("¥1,440");
  await expect(page.getByText("mvp-1.1", { exact: false })).toBeVisible();
});

test("可以录入三险正常路径并展示 3984 元", async ({ page }) => {
  await page.goto("/");
  await completeThreeProductQuote(page);

  await expect(page.getByText("年度预估合计")).toBeVisible();
  await expect(page.locator(".total-amount")).toContainText("¥3,984");
  await expect(page.getByText("3 个险种", { exact: false })).toBeVisible();
  await expect(page.getByText("食品生产许可证", { exact: false })).toBeVisible();
});

test("少于 8 人明确显示不承保且不转人工报价", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("100");
  await chooseProducts(page, ["雇主责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("基础版").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("服务员人数").fill("7");
  await page.getByLabel("是，全部符合").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  await expect(page.getByRole("heading", { name: "不符合承保条件" })).toBeVisible();
  await expect(page.getByText("不转人工报价", { exact: false })).toBeVisible();
  await expect(page.getByText("年度预估合计")).toHaveCount(0);
});

test("年龄范围存在例外时转人工报价", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("100");
  await chooseProducts(page, ["雇主责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("升级版").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("服务员人数").fill("8");
  await page.getByLabel("否，存在范围外员工").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  await expect(page.getByRole("heading", { name: "需人工报价" })).toBeVisible();
  await expect(page.getByText("员工年龄", { exact: false })).toBeVisible();
  await expect(page.getByText("年度预估合计")).toHaveCount(0);
});

test("部分报价只展示已知小计而不展示最终总价", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("2500");
  await chooseProducts(page, ["公众责任险", "食品安全责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P1").check();
  await page.getByLabel("食品安全责任险方案一").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  await expect(page.getByText("已知保费小计")).toBeVisible();
  await expect(page.locator(".result-subtotal")).toContainText("¥2,100");
  await expect(page.getByText("最终总价待人工确认", { exact: true })).toBeVisible();
  await expect(page.getByText("年度预估合计")).toHaveCount(0);
});

test("刷新后恢复当前会话输入", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("350");
  await chooseProducts(page, ["公众责任险"]);
  await page.reload();

  await expect(page.getByLabel("经营面积")).toHaveValue("350");
  await expect(page.getByLabel("公众责任险", { exact: true })).toBeChecked();
});

test("取消险种后不保留或展示该险种方案", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await chooseProducts(page, ["公众责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P2").check();
  await page.getByRole("button", { name: "上一步" }).click();
  await page.getByLabel("公众责任险", { exact: true }).uncheck();
  await chooseProducts(page, ["食品安全责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();

  await expect(page.getByRole("group", { name: "公众责任险" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "食品安全责任险" })).toBeVisible();
});

test("结果页保留销售联系扩展点并可重新计算", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("99.99");
  await chooseProducts(page, ["食品安全责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("食品安全责任险方案一").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  await expect(page.getByText("¥640", { exact: true })).toBeVisible();
  await expect(page.getByText("餐饮安心保顾问", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "修改条件，重新计算" }).click();
  await expect(page.getByLabel("经营面积")).toHaveValue("99.99");
});
