import { describe, expect, it } from "vitest";

import {
  auditZhihuExpression,
  createZhihuExpressionDraft,
  ZhihuExpressionSeedSchema
} from "@/features/zhihu-expression";

const seed = ZhihuExpressionSeedSchema.parse({
  version: 1,
  topic: "要不要换一份更有成长但不稳定的工作",
  route: "搭桥试水",
  actions: ["先核对岗位真实职责", "安排一次低成本试合作"],
  assumption: "新机会的成长空间能抵消不稳定成本 · 暂时不清楚",
  experiment: {
    title: "七天机会条件核验",
    question: "岗位职责和现金流边界是否足够清楚？",
    status: "已完成 7 天",
    evidenceProgress: 72,
    nextStep: "补齐书面条件后再决定是否离开现岗位。",
    feedback: "inconclusive"
  },
  sources: [
    {
      title: "换工作前先问清楚什么",
      author: "知乎用户",
      url: "https://www.zhihu.com/answer/123456"
    }
  ]
});

describe("TASK-042 Zhihu expression draft", () => {
  it("creates an editable personal-review draft with source links, not an automatic answer", () => {
    const draft = createZhihuExpressionDraft(seed);

    expect(draft.title).toContain(seed.topic);
    expect(draft.body).toContain("我验证到的事");
    expect(draft.body).toContain("我还不知道的事");
    expect(draft.body).toContain(seed.sources[0].url);
    expect(draft.body).toContain("个人复盘草稿");
    expect(draft.body).not.toContain("session");
  });

  it("flags common sensitive strings without returning the private value", () => {
    const findings = auditZhihuExpression(
      "联系我 13812345678 或 hello@example.com，身份证 110101199001011234，工资 18000 元"
    );

    expect(findings.map((item) => item.kind)).toEqual([
      "phone",
      "email",
      "id",
      "amount"
    ]);
    expect(JSON.stringify(findings)).not.toContain("13812345678");
    expect(JSON.stringify(findings)).not.toContain("hello@example.com");
  });
});
