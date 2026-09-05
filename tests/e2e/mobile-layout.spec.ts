import { expect, test } from "@playwright/test";

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
