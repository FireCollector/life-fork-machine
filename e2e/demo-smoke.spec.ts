import { expect, test } from "@playwright/test";

test("recommended demo route completes and survives refresh", async ({
  page
}) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/play\/demo-bridge-v1$/);

  await expect(
    page.getByRole("heading", { name: "先试四周，别急着辞职", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: /把四周要查的事写下来/ }).click();
  await expect(
    page.getByRole("heading", { name: "如果选了另外两条路呢？" })
  ).toBeVisible();
  await page.getByRole("button", { name: "进入第 2 幕" }).click();

  await page.getByRole("button", { name: /条件谈妥，再正式加入/ }).click();
  await page.getByRole("button", { name: "进入第 3 幕" }).click();
  await expect(
    page.getByRole("heading", { name: "你最相信的事，先查一查" })
  ).toBeVisible();

  await page.getByRole("button", { name: /领导真会把股权给你/ }).click();
  await expect(
    page.getByText("先看合同：股权和职位真的写进去了吗？")
  ).toBeVisible();
  await page.getByRole("button", { name: /合同里没有/ }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "事情和想的不一样" })
  ).toBeVisible();
  await page.getByRole("button", { name: /继续下一步/ }).click();

  await page.getByRole("button", { name: /条件都过关，正式加入/ }).click();
  await page.getByRole("button", { name: /生成代价报告/ }).click();
  await expect(page).toHaveURL(/\/result\/demo-bridge-v1$/);

  await expect(
    page.getByRole("heading", { name: "搭桥试水的代价地图。" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "把这次推演带走" })
  ).toBeVisible();
  await page.getByRole("button", { name: "复制分享摘要" }).click();
  await expect(
    page.getByRole("button", { name: "已复制分享摘要" })
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "留守轨道、全押新局和搭桥试水的六维代价雷达对比"
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "七天家庭承受力核验" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "另外两条路，现在也能点开看看" })
  ).toBeVisible();
  await page.getByRole("tab", { name: /留守轨道/ }).click();
  await expect(
    page.getByRole("button", { name: "从这条路重新推演" })
  ).toBeVisible();
  await page.getByRole("button", { name: "快速推进实验" }).click();
  await expect(page.getByText("已推进 7 / 7 天")).toBeVisible();
  await expect(page.getByText("证据进度 100 / 100").first()).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "搭桥试水的代价地图。" })
  ).toBeVisible();
});
