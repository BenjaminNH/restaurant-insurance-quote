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
  await page.getByRole("spinbutton", { name: "内勤 / 收银人数" }).fill("2");
  await page.getByRole("spinbutton", { name: "服务员人数" }).fill("6");
  await page.getByRole("spinbutton", { name: "厨师 / 保洁人数" }).fill("4");
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P2").check();
  await page.getByLabel("食品安全责任险方案一").check();
  await page.getByRole("button", { name: "查看报价" }).click();
}

async function openEmployeeStep(page: Page) {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await chooseProducts(page, ["雇主责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("升级版").check();
  await page.getByRole("button", { name: "下一步" }).click();
}

test("顶部标题与步骤同排且勾选险种不会使进度倒退", async ({ page }) => {
  await page.goto("/");
  const header = page.locator(".header-row");
  await expect(header.getByRole("heading", { name: "保费智能报价" })).toBeVisible();
  await expect(header.getByText("第 1 / 2 步", { exact: true })).toBeVisible();
  await expect(page.getByText("餐饮安心保", { exact: true })).toHaveCount(0);

  const progress = page.getByRole("progressbar", { name: "报价进度" });
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await chooseProducts(page, ["雇主责任险", "公众责任险", "食品安全责任险"]);
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await expect(header.getByText("第 1 / 5 步", { exact: true })).toBeVisible();
});

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

test("显示紧凑进度、免责声明与移动端表单语义", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "保费智能报价" }),
  ).toBeVisible();
  await expect(page.getByText("第 1 / 2 步", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "报价进度" })).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByLabel("经营面积")).toHaveAttribute("inputmode", "decimal");
  await expect(page.getByRole("button", { name: "下一步" })).toBeVisible();
  await expect(page.getByText("预估保费仅供参考", { exact: false })).toBeVisible();
  await expect(page.getByText("→", { exact: true })).toHaveCount(0);
});

test("三种险种都直接显示简短解释且面积只使用直接输入", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("员工工作期间发生意外时提供保障，8 人起保")).toBeVisible();
  await expect(page.getByText("顾客在店内发生意外或财物损失时提供保障")).toBeVisible();
  await expect(page.getByText("食品安全事故造成损失时提供保障")).toBeVisible();
  await expect(page.getByRole("button", { name: /了解详情/ })).toHaveCount(0);
  await expect(page.getByLabel("经营面积")).toHaveAttribute("type", "number");
  await expect(page.getByRole("button", { name: /平方米/ })).toHaveCount(0);
});

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

test("员工步骤未满足起保人数时底栏显示人数缺口", async ({ page }) => {
  await openEmployeeStep(page);

  const summary = page.locator(".bottom-summary");
  await expect(summary).toContainText("雇主责任险");
  await expect(summary).toContainText("还差 8 人达到起保要求");
  await expect(summary).not.toContainText("预估合计");
  await expect(summary).not.toContainText("/ 年");
});

test("员工页不要求年龄确认并正确区分起保状态", async ({ page }) => {
  await openEmployeeStep(page);
  await expect(page.getByLabel("是，全部符合")).toHaveCount(0);
  await expect(page.getByLabel("否，存在范围外员工")).toHaveCount(0);
  await expect(page.getByText("投保员工须为 16–65 周岁，正式投保时核验。")).toBeVisible();
  await expect(page.locator(".card-heading").getByText(/年龄/)).toHaveCount(0);

  const note = page.locator(".condition-note");
  await page.getByRole("spinbutton", { name: "服务员人数" }).fill("7");
  await expect(note).toHaveAttribute("data-status", "warning");
  await expect(note).toContainText("还差 1 人达到 8 人起保要求");
  await page.getByRole("spinbutton", { name: "服务员人数" }).fill("8");
  await expect(note).toHaveAttribute("data-status", "positive");
  await expect(note).toContainText("满足最低承保人数");
});

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

test("公众险结果只展示已选险种的保障说明且没有无行为销售按钮", async ({ page }) => {
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

test("报价结果不展示规则版本且险种明细不重复名称", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await chooseProducts(page, ["公众责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P2").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  await expect(page.getByText(/规则版本/)).toHaveCount(0);
  await expect(page.getByText("公众责任险 · 方案 P2", { exact: true })).toBeVisible();
  await expect(page.getByText("公众责任险 · 公众责任险方案 P2", { exact: true })).toHaveCount(0);
});

test("食品安全险明细也只显示一次险种名称", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await chooseProducts(page, ["食品安全责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("食品安全责任险方案一").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  await expect(page.getByText("食品安全责任险 · 方案一", { exact: true })).toBeVisible();
  await expect(page.getByText("食品安全责任险 · 食品安全责任险方案一", { exact: true })).toHaveCount(0);
});

test("隐藏的险种复选框聚焦时卡片显示焦点环", async ({ page }) => {
  await page.goto("/");

  const product = page.getByLabel("公众责任险", { exact: true });
  await product.focus();

  await expect(product.locator("..")).toHaveCSS("outline-style", "solid");
  await expect(product.locator("..")).toHaveCSS("outline-width", "3px");
});

test("勾选雇主险不会产生 pointer capture 控制台异常", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await page.getByLabel("雇主责任险", { exact: true }).check();

  expect(errors.filter((message) => /pointer capture/i.test(message))).toEqual([]);
});

test("必填错误阻止进入下一步并聚焦首个错误字段", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "下一步" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "请完善" })).toContainText("经营面积");
  await expect(page.getByRole("alert").filter({ hasText: "请完善" })).toContainText("险种");
  await expect(page.getByLabel("经营面积")).toBeFocused();

  const headerBox = await page.locator(".quote-header").boundingBox();
  const alertBox = await page.getByRole("alert").filter({ hasText: "请完善" }).boundingBox();
  if (!headerBox || !alertBox) throw new Error("Expected the header and error summary to have bounding boxes");
  expect(headerBox.y + headerBox.height).toBeLessThanOrEqual(alertBox.y);
});

test("面积有效但未选险种时聚焦第一个险种", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("120");
  await page.getByRole("button", { name: "下一步" }).click();

  await expect(page.getByLabel("雇主责任险", { exact: true })).toBeFocused();
});

test("只选择公众险时跳过雇主险步骤并得到正常报价", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await chooseProducts(page, ["公众责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();

  await expect(page.getByText("第 2 / 3 步", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "选择保障方案" })).toBeVisible();
  await page.getByLabel("公众责任险方案 P2").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  await expect(page.getByText("年度预估合计")).toBeVisible();
  await expect(page.locator(".total-amount")).toContainText("¥1,440");
});

test("可以录入三险正常路径并展示 3984 元", async ({ page }) => {
  await page.goto("/");
  await completeThreeProductQuote(page);

  await expect(page.getByText("年度预估合计")).toBeVisible();
  await expect(page.locator(".total-amount")).toContainText("¥3,984");
  await expect(page.getByText("3 个险种", { exact: false })).toBeVisible();
  await expect(page.getByText("食品生产许可证", { exact: false })).toBeVisible();
});

test("结果页按设计展示业务联系人并可复制业务号码", async ({ page }) => {
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

  await expect(page.getByRole("heading", { name: "业务人员联系方式" })).toBeVisible();
  await expect(page.getByText("欧志军", { exact: true })).toBeVisible();
  await expect(page.getByText("133 4255 1879", { exact: true })).toBeVisible();
  await expect(page.getByText("微信同号", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "欧志军的微信二维码" })).toBeVisible();
  await expect(page.getByRole("button", { name: "查看名片" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "业务人员名片" })).toHaveCount(0);
  await expect(page.locator(".contact-details .copy-contact-button")).toBeVisible();

  await page.getByRole("button", { name: "复制号码" }).click();
  await expect(page.getByRole("button", { name: "已复制" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("copied-contact-number")))
    .toBe("13342551879");
});

test("ref=ozj 完成报价后显示对应的业务联系人", async ({ page }) => {
  await page.goto("/?from=wechat&ref=ozj&campaign=autumn");
  await completeThreeProductQuote(page);

  await expect(page.getByRole("heading", { name: "业务人员联系方式" })).toBeVisible();
  await expect(page.getByText("欧志军", { exact: true })).toBeVisible();
  await expect(page.getByText("133 4255 1879", { exact: true })).toBeVisible();
});

test("ref=demo 完成报价后显示演示联系人与演示二维码提示", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          window.sessionStorage.setItem("copied-demo-contact-number", value);
        },
      },
    });
  });
  await page.goto("/?from=wechat&ref=demo&campaign=autumn");
  await completeThreeProductQuote(page);

  await expect(page.getByRole("heading", { name: "业务人员联系方式" })).toBeVisible();
  await expect(page.getByText("演示顾问", { exact: true })).toBeVisible();
  await expect(page.getByText("138 0013 8000", { exact: true })).toBeVisible();
  await expect(page.getByText("演示二维码 · 扫码打开本页", { exact: true })).toBeVisible();
  await expect(page.getByText("长按识别加微信", { exact: true })).toHaveCount(0);
  const demoQr = page.getByRole("img", { name: "演示顾问的演示二维码" });
  await expect(demoQr).toBeVisible();
  await expect(demoQr).toHaveAttribute("src", /\/sales-contacts\/demo\/wechat-qr\.png$/);

  await page.getByRole("button", { name: "复制号码" }).click();
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("copied-demo-contact-number")))
    .toBe("13800138000");
});

test("重复 ref 只使用第一个值", async ({ page }) => {
  await page.goto("/?ref=demo&ref=ozj");
  await completeThreeProductQuote(page);

  await expect(page.getByText("演示顾问", { exact: true })).toBeVisible();
  await expect(page.getByText("欧志军", { exact: true })).toHaveCount(0);
});

test("未知 ref 完成报价后回退默认业务联系人", async ({ page }) => {
  await page.goto("/?from=wechat&ref=unknown&campaign=autumn");
  await completeThreeProductQuote(page);

  await expect(page.getByRole("heading", { name: "业务人员联系方式" })).toBeVisible();
  await expect(page.getByText("欧志军", { exact: true })).toBeVisible();
  await expect(page.getByText("133 4255 1879", { exact: true })).toBeVisible();
});

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
  await expect(page.getByRole("button", { name: "已复制" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("fallback-copy-command")))
    .toBe("copy");
});

test("复制业务号码失败时只在按钮中反馈并保留可选号码", async ({ page }) => {
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
  await expect(page.getByRole("button", { name: "复制失败" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByText("133 4255 1879", { exact: true })).toBeVisible();
});

test("少于 8 人明确显示不承保且不转人工报价", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("100");
  await chooseProducts(page, ["雇主责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("基础版").check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("spinbutton", { name: "服务员人数" }).fill("7");
  await page.getByRole("button", { name: "查看报价" }).click();

  await expect(page.getByRole("heading", { name: "不符合承保条件" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "业务人员联系方式" })).toBeVisible();
  await expect(page.getByText("不转人工报价", { exact: false })).toBeVisible();
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

  await expect(page.locator(".result-subtotal")).toHaveCount(0);
  await expect(page.getByText(/已知保费小计 ¥2,100/)).toHaveCount(1);
  await expect(page.getByText("暂不展示最终总价", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "部分需人工确认" })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "业务人员联系方式" })).toBeVisible();
  await expect(page.getByText("年度预估合计")).toHaveCount(0);
});

test("人工报价结果也展示业务联系方式", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("3500");
  await chooseProducts(page, ["公众责任险"]);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P1").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  await expect(page.getByRole("heading", { name: "需人工报价" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "业务人员联系方式" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "业务人员联系方式" })).toBeVisible();
  await page.getByRole("button", { name: "修改条件，重新计算" }).click();
  await expect(page.getByLabel("经营面积")).toHaveValue("99.99");
});
