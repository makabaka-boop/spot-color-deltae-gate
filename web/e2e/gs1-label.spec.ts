import { expect, test } from "@playwright/test";

/**
 * 批次标签核验区端到端：浏览器 → nginx → FastAPI，真实服务无打桩。
 * 覆盖一次有效扫描（FNC1 扫描格式）、一次损坏标签重试（可读格式），
 * 并确认原有色差主流程在标签核验失败时仍可独立完成。
 */

// 合法标签：GTIN 09506000134352（校验位 2）、批号 INK2407、失效日期 2028-09-30
const SCAN_OK = "010950600013435210INK2407\u001d17280930"; // FNC1 = GS 控制字符
const READABLE_BAD_CHECK = "(01)09506000134353(10)INK2407(17)280930"; // 校验位应为 2
const READABLE_OK = "(01)09506000134352(10)INK2407(17)280930";

// Sharma 参考对 #25：ΔE00 = 1.2644（放行）
const PASS_PAIR = {
  standard: [60.2574, -34.0099, 36.2677],
  sample: [60.4626, -34.1751, 39.4387],
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("有效扫描：FNC1 扫描格式识别为商品编码、批号、失效日期，可继续扫描下一桶", async ({
  page,
}) => {
  await expect(page.getByTestId("label-status")).toHaveText("待输入");

  await page.getByTestId("label-raw").fill(SCAN_OK);
  await page.getByTestId("label-verify").click();

  await expect(page.getByTestId("label-status")).toHaveText("已识别");
  await expect(page.getByTestId("label-format")).toContainText("扫码格式");
  await expect(page.getByTestId("label-gtin")).toHaveText("09506000134352");
  await expect(page.getByTestId("label-lot")).toHaveText("INK2407");
  await expect(page.getByTestId("label-expires")).toHaveText("2028-09-30");

  // 继续扫描下一桶：回到待输入，输入框清空
  await page.getByTestId("label-next").click();
  await expect(page.getByTestId("label-status")).toHaveText("待输入");
  await expect(page.getByTestId("label-raw")).toHaveValue("");
  await expect(page.getByTestId("label-result")).toHaveCount(0);
});

test("损坏标签重试：校验位错误被拒绝并定位，修正后识别成功", async ({ page }) => {
  await page.getByTestId("label-raw").fill(READABLE_BAD_CHECK);
  await page.getByTestId("label-verify").click();

  // 已拒绝：保留原文，指出首个无法解析的位置（校验位 = 第 18 个字符）
  await expect(page.getByTestId("label-status")).toHaveText("已拒绝");
  await expect(page.getByTestId("label-error")).toContainText("校验位");
  await expect(page.getByTestId("label-error-position")).toContainText(
    "第 18 个字符",
  );
  await expect(page.getByTestId("label-error-char")).toHaveText("3");
  await expect(page.getByTestId("label-raw")).toHaveValue(READABLE_BAD_CHECK);

  // 修正校验位后重试 → 已识别
  await page.getByTestId("label-raw").fill(READABLE_OK);
  await expect(page.getByTestId("label-status")).toHaveText("待输入");
  await page.getByTestId("label-verify").click();
  await expect(page.getByTestId("label-status")).toHaveText("已识别");
  await expect(page.getByTestId("label-gtin")).toHaveText("09506000134352");
  await expect(page.getByTestId("label-error")).toHaveCount(0);
});

test("色差主流程独立：标签被拒绝不影响已有结论，比对可再次完成", async ({ page }) => {
  // 先完成一次色差比对（放行）
  await page.getByTestId("standard.L").fill(String(PASS_PAIR.standard[0]));
  await page.getByTestId("standard.a").fill(String(PASS_PAIR.standard[1]));
  await page.getByTestId("standard.b").fill(String(PASS_PAIR.standard[2]));
  await page.getByTestId("sample.L").fill(String(PASS_PAIR.sample[0]));
  await page.getByTestId("sample.a").fill(String(PASS_PAIR.sample[1]));
  await page.getByTestId("sample.b").fill(String(PASS_PAIR.sample[2]));
  await page.getByTestId("compare-button").click();
  await expect(page.getByTestId("result-panel")).toHaveAttribute(
    "data-passed",
    "true",
  );

  // 标签核验失败：色差结论与输入原样保留
  await page.getByTestId("label-raw").fill(READABLE_BAD_CHECK);
  await page.getByTestId("label-verify").click();
  await expect(page.getByTestId("label-status")).toHaveText("已拒绝");
  await expect(page.getByTestId("result-panel")).toBeVisible();
  await expect(page.getByTestId("verdict")).toContainText("放行");
  await expect(page.getByTestId("standard.L")).toHaveValue(
    String(PASS_PAIR.standard[0]),
  );

  // 标签核验区处于已拒绝状态时，色差主流程仍可独立再次完成
  await page.getByTestId("compare-button").click();
  await expect(page.getByTestId("result-panel")).toHaveAttribute(
    "data-passed",
    "true",
  );
  await expect(page.getByTestId("metric-delta")).toContainText("1.26");
});
