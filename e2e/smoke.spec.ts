import { expect, test } from "@playwright/test";

test("homepage and health endpoint are available", async ({
  page,
  request
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "不是预测你会怎样，而是让你先活一次。"
    })
  ).toBeVisible();

  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    ok: true,
    zhihu: { oauthEnabled: false }
  });
});

test("topic lab switches presets and validates arbitrary topic drafts", async ({
  page
}) => {
  await page.goto("/topic-lab");
  await expect(
    page.getByRole("heading", { name: "先把你的问题，编译成一场人生实验。" })
  ).toBeVisible();
  await page.getByRole("button", { name: "读研还是工作" }).click();
  await expect(
    page.getByRole("heading", { name: "继续工作，还是辞职读研？" })
  ).toBeVisible();
  await page
    .getByLabel("你真正想想清楚的问题")
    .fill("要不要离开大城市回老家？");
  await page.getByRole("button", { name: "生成候选结构" }).click();
  await expect(
    page.getByRole("heading", { name: "要不要离开大城市回老家？" })
  ).toBeVisible();
  await expect(page.getByText("需要审核").first()).toBeVisible();
});

test("decision archive starts local-only and does not mistake fixed demos for personal history", async ({
  page
}) => {
  await page.goto("/archive");
  await expect(
    page.getByRole("heading", { name: "把每一次决定，留给未来的你。" })
  ).toBeVisible();
  await expect(page.getByText("还没有可回看的决策")).toBeVisible();
  await expect(
    page.getByText("固定 Demo 不会混进你的个人档案。")
  ).toBeVisible();
});

test("evidence review enforces approval gate and version lock", async ({
  page
}) => {
  await page.goto("/evidence-review");
  await page.evaluate(() =>
    localStorage.removeItem("life-fork-machine:evidence-review:v1")
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "把候选剧本，交给真实素材过一遍。" })
  ).toBeVisible();

  const approveButtons = page.getByRole("button", { name: "通过" });
  const rejectButtons = page.getByRole("button", { name: "排除" });
  for (let index = 0; index < 3; index += 1) {
    await approveButtons.nth(index).click();
  }
  for (let index = 3; index < (await rejectButtons.count()); index += 1) {
    await rejectButtons.nth(index).click();
  }

  const publishButton = page.getByRole("button", { name: "发布候选剧本" });
  await expect(publishButton).toBeEnabled();
  await publishButton.click();
  await expect(
    page.getByRole("button", { name: "已发布当前版本" })
  ).toBeVisible();
  await expect(page.getByText(/已通过审核门禁/)).toBeVisible();

  await page.getByRole("button", { name: "重新生成审核包" }).click();
  await expect(page.getByText("Review package v2")).toBeVisible();
});

const routes = [
  "/",
  "/calibrate",
  "/forge",
  "/topic-lab",
  "/archive",
  "/play/demo",
  "/result/demo"
];
const viewports = [
  { name: "mobile", width: 360, height: 800 },
  { name: "tablet", width: 768, height: 900 },
  { name: "desktop", width: 1440, height: 900 }
];

for (const viewport of viewports) {
  test(`${viewport.name} routes render without horizontal overflow`, async ({
    page
  }) => {
    await page.setViewportSize(viewport);

    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator("h1")).toBeVisible();

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflows, `${route} should fit ${viewport.width}px`).toBe(false);
    }
  });
}
