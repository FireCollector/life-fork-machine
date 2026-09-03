import { describe, expect, it } from "vitest";

import {
  buildShareCardSvg,
  buildShareSummary,
  type ShareCardData
} from "../src/features/game";

const data: ShareCardData = {
  worldName: "搭桥试水",
  worldTagline: "先留退路，再买信息",
  actionLabels: ["把四周要查的事写下来", "条件谈妥，再正式加入", "条件都过关，正式加入"],
  assumptionLabel: "领导真会把股权给你 · 证据冲突",
  experimentTitle: "七天家庭承受力核验",
  experimentQuestion: "家里能不能扛住一年少收入和更多加班？",
  experimentStatus: "已完成 7 天",
  nextStep: "先补现金储备或缩小试水范围，不急着离职。",
  evidenceScore: 100,
  metrics: [
    { label: "当前强项", value: "找工作余地" },
    { label: "主要压力", value: "身心压力" },
    { label: "行动数", value: "3 次" },
    { label: "证据进度", value: "100 / 100" }
  ]
};

describe("D20 privacy-safe share card", () => {
  it("creates a share summary without technical identifiers", () => {
    const summary = buildShareSummary(data);
    expect(summary).toContain("我在《人生分岔机》里选择了「搭桥试水」");
    expect(summary).toContain("1. 把四周要查的事写下来");
    expect(summary).toContain("验证问题：家里能不能扛住一年少收入和更多加班？");
    expect(summary).toContain("下一步：先补现金储备或缩小试水范围，不急着离职。");
    expect(summary).toContain("证据进度：100 / 100");
    expect(summary).not.toContain("session");
    expect(summary).not.toContain("zhihu.com");
  });

  it("escapes text in the downloadable SVG", () => {
    const svg = buildShareCardSvg({
      ...data,
      worldName: "A < B & C"
    });
    expect(svg).toContain("A &lt; B &amp; C");
    expect(svg).toContain("把四周要查的事写下来");
    expect(svg).toContain("七天家庭承受力核验");
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain("不是预测或职业建议");
  });
});
