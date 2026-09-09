import { expect, test } from "@playwright/test";

test("graduate-school demo completes a distinct three-act route", async ({
  page
}) => {
  await page.goto("/demo?scenario=graduate-school");
  await expect(page).toHaveURL(/\/play\/demo-graduate-v1$/);

  await expect(
    page.getByRole("heading", {
      name: "先别辞，给目标一次真实碰撞",
      exact: true
    })
  ).toBeVisible();
  await page.getByRole("button", { name: /查清三个目标项目的硬门槛/ }).click();
  await page.getByRole("button", { name: "进入第 2 幕" }).click();

  await expect(
    page.getByRole("heading", { name: "把“我想读”换成“我能完成”", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: /写一页转向说明/ }).click();
  await page.getByRole("button", { name: "进入第 3 幕" }).click();

  await expect(
    page.getByRole("heading", { name: "你最相信的事，先查一查" })
  ).toBeVisible();
  await page
    .getByRole("button", { name: /拿到学位，就能打开想去的赛道/ })
    .click();
  await page.getByRole("button", { name: "暂时不清楚" }).click();
  await page.getByRole("button", { name: /继续下一步/ }).click();

  await page
    .getByRole("button", { name: /提交申请，同时保留工作选项/ })
    .click();
  await page.getByRole("button", { name: /生成代价报告/ }).click();
  await expect(page).toHaveURL(/\/result\/demo-graduate-v1$/);

  await expect(
    page.getByRole("heading", { name: "在职验证再决定的代价地图。" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "在职验证再决定七天现实核验" })
  ).toBeVisible();
  await page.getByRole("button", { name: "快速推进实验" }).click();
  await expect(page.getByText("已推进 7 / 7 天")).toBeVisible();
});
