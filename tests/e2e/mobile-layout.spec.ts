import { expect, test } from "@playwright/test";

function relativeLuminance(color: string) {
  const channels = color.match(/\d+(?:\.\d+)?/g)?.map(Number);
  if (!channels || channels.length < 3) throw new Error(`Expected an RGB color, received ${color}`);

  return channels.slice(0, 3).reduce((sum, channel, index) => {
    const linear = channel / 255 <= 0.04045
      ? channel / 255 / 12.92
      : ((channel / 255 + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
}

function contrastRatio(foreground: string, background: string) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

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

test("数字键盘压缩可视区域时收起底栏并保留当前字段", async ({ page }) => {
  await page.addInitScript(() => {
    const initialHeight = window.innerHeight;
    let layoutViewportHeight = initialHeight;

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      get: () => layoutViewportHeight,
    });

    class MockVisualViewport extends EventTarget {
      height = initialHeight;
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
      layoutViewportHeight = height;
      viewport.height = height;
      viewport.dispatchEvent(new Event("resize"));
    };
    (window as unknown as { __restoreVisualViewportHeight: () => void }).__restoreVisualViewportHeight = () => {
      layoutViewportHeight = initialHeight;
      viewport.height = initialHeight;
      viewport.dispatchEvent(new Event("resize"));
    };
  });

  await page.goto("/");
  await page.getByLabel("经营面积").focus();
  await page.evaluate(() => (window as unknown as { __setVisualViewportHeight: (height: number) => void }).__setVisualViewportHeight(377));

  await expect(page.locator(".bottom-wrap")).toBeHidden();
  await expect(page.getByLabel("经营面积")).toBeInViewport();

  await page.evaluate(() => (window as unknown as { __restoreVisualViewportHeight: () => void }).__restoreVisualViewportHeight());
  await expect(page.locator(".bottom-wrap")).toBeVisible();
});

test("无 VisualViewport 时仅键盘输入控件收起底栏", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
  });

  await page.goto("/");
  await page.getByLabel("公众责任险", { exact: true }).focus();
  await expect(page.locator(".bottom-wrap")).toBeVisible();

  await page.getByLabel("经营面积").focus();
  await expect(page.locator(".bottom-wrap")).toBeHidden();

  await page.getByLabel("经营面积").blur();
  await expect(page.locator(".bottom-wrap")).toBeVisible();
});

test("目标手机视口无横向溢出且使用紧凑字号", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("经营面积")).toBeVisible();

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
  const productBox = await page
    .getByLabel("公众责任险", { exact: true })
    .locator("..")
    .boundingBox();

  expect(nextBox?.height).toBeGreaterThanOrEqual(44);
  expect(productBox?.height).toBeGreaterThanOrEqual(44);
});

test("主操作按钮的实际渲染前景与背景满足 WCAG AA 对比度", async ({ page }) => {
  await page.goto("/");

  const colors = await page.getByRole("button", { name: "下一步" }).evaluate((button) => {
    const styles = getComputedStyle(button);
    return { foreground: styles.color, background: styles.backgroundColor };
  });

  expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
});

test("员工人数输入框不显示原生数字微调按钮", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await page.getByLabel("雇主责任险", { exact: true }).check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("升级版").check();
  await page.getByRole("button", { name: "下一步" }).click();

  const appearance = await page
    .getByRole("spinbutton", { name: "服务员人数" })
    .evaluate((input) => getComputedStyle(input).appearance);

  expect(appearance).toBe("textfield");
});

test("结构性字符图标被替换且结果金额不过度放大", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("经营面积").fill("260");
  await page.getByLabel("公众责任险", { exact: true }).check();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("公众责任险方案 P2").check();
  await page.getByRole("button", { name: "查看报价" }).click();

  const amountSize = await page
    .locator(".total-amount")
    .evaluate((element) => getComputedStyle(element).fontSize);
  expect(Number.parseFloat(amountSize)).toBeLessThanOrEqual(32);
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(/[✓ⓘ▧☎→]/);
});

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

  const buttonHeight = await page
    .getByRole("button", { name: "复制号码" })
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(buttonHeight).toBeGreaterThanOrEqual(44);

  const viewCardButtonHeight = await page
    .getByRole("button", { name: "查看名片" })
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(viewCardButtonHeight).toBeGreaterThanOrEqual(44);

  const qrSize = await page
    .getByRole("img", { name: "欧志军的微信二维码" })
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });
  expect(qrSize.width).toBe(104);
  expect(qrSize.height).toBe(104);

  const contactVisuals = await page.locator(".sales-contact").evaluate((contact) => {
    const styles = (selector: string) => getComputedStyle(contact.querySelector(selector)!);
    return {
      headingSize: styles("h2").fontSize,
      nameSize: styles(".contact-name").fontSize,
      phoneSize: styles(".contact-number").fontSize,
      badgeSize: styles(".contact-badge").fontSize,
      copyBackground: styles(".copy-contact-button").backgroundColor,
      viewBackground: styles(".view-contact-card-button").backgroundColor,
      viewBorderWidth: styles(".view-contact-card-button").borderTopWidth,
      copyFontSize: styles(".copy-contact-button").fontSize,
      copyRadius: styles(".copy-contact-button").borderRadius,
      viewFontSize: styles(".view-contact-card-button").fontSize,
      viewRadius: styles(".view-contact-card-button").borderRadius,
    };
  });
  expect(contactVisuals).toEqual({
    headingSize: "15px",
    nameSize: "17px",
    phoneSize: "17px",
    badgeSize: "10px",
    copyBackground: "rgb(30, 58, 95)",
    viewBackground: "rgb(233, 238, 247)",
    viewBorderWidth: "0px",
    copyFontSize: "14px",
    copyRadius: "22px",
    viewFontSize: "14px",
    viewRadius: "22px",
  });

  await page.getByRole("button", { name: "查看名片" }).click();
  const dialogBox = await page.getByRole("dialog", { name: "业务人员名片" }).boundingBox();
  if (!dialogBox) throw new Error("Expected the contact card dialog to have a bounding box");
  expect(dialogBox.width).toBeLessThanOrEqual(327);
  expect(dialogBox.height).toBeLessThan(780);

  const fullCardSize = await page
    .getByRole("img", { name: "欧志军的微信名片" })
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });
  expect(fullCardSize.width).toBe(150);
  expect(fullCardSize.height).toBeLessThanOrEqual(223);
});
