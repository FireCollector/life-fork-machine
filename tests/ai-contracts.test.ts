import { describe, expect, it } from "vitest";

import {
  AiCandidateBundleSchema,
  AiFailureSchema,
  AiGenerationRequestSchema,
  parseAiCandidateBundle
} from "../src/features/ai";

const sourceIds = [
  "zh-career-bridge-01",
  "zh-career-bridge-02",
  "zh-career-bridge-03"
];

function request() {
  return {
    contractVersion: 1,
    requestId: "request-001",
    task: "propose-next-steps",
    topic: {
      rawQuestion: "稳定高薪工作与跟领导创业如何选择？",
      locale: "zh-CN",
      confirmedConstraints: [{ category: "cash", text: "我需要保留家庭现金流" }]
    },
    evidence: sourceIds.map((id, index) => ({
      id,
      title: `来源 ${index + 1}`,
      author: `作者 ${index + 1}`,
      claim: "社区经验提示这条路径需要先把条件和风险写清楚。",
      conditions: ["处境不同，不能直接照搬"],
      stance: index === 1 ? "oppose" : "conditional",
      url: `https://www.zhihu.com/question/${1000 + index}`
    })),
    instruction:
      "Return a reviewable candidate. Do not predict outcomes, recommend a best route, or mutate game state."
  };
}

function claim(text: string, sourceId = sourceIds[0]) {
  return {
    text,
    citations: [{ sourceId, use: "claim" }],
    confidence: "medium",
    uncertainty: "来源描述的是他人的处境，仍需核对你的条件。"
  };
}

function candidate() {
  return {
    contractVersion: 1,
    provenance: "ai-generated-candidate",
    metadata: {
      provider: "test-provider",
      model: "test-model",
      generatedAt: "2026-09-07T15:30:00.000Z",
      promptVersion: "task-029.v1"
    },
    topic: {
      normalizedQuestion: "稳定高薪工作与跟领导创业如何选择？",
      scope: "career",
      tension:
        "你需要同时比较现金流、成长机会和承诺是否兑现，而不是只问哪条路更好。",
      acknowledgedConstraints: ["需要保留家庭现金流"],
      missingInformation: ["股权、职责和退出条件是否能写入可核验材料"]
    },
    evidenceSynthesis: {
      agreements: [claim("多条经验都强调先核对书面条件。")],
      disagreements: [
        claim("不同回答对风险承受程度的判断不同。", sourceIds[1])
      ],
      applicabilityWarnings: [
        claim("他人的现金缓冲不等于你的现金缓冲。", sourceIds[2])
      ]
    },
    routes: [
      {
        id: "stay",
        label: "继续当前工作",
        tradeoff: claim("保住现金流，也可能延后尝试新机会。"),
        unknownToVerify: claim("当前岗位是否仍能带来目标成长。")
      },
      {
        id: "bridge",
        label: "先搭桥验证",
        tradeoff: claim("先花时间核验条件，再决定是否加码。"),
        unknownToVerify: claim("领导是否愿意提供可核验的职责和权益材料。")
      }
    ],
    assumptions: [
      {
        label: "权益承诺可以兑现",
        whyItMatters: claim("它会影响你承担风险的上限。"),
        checkQuestion: "能否在本周拿到职责、现金和权益的书面版本？"
      }
    ],
    proposedActions: [
      {
        label: "索取书面材料",
        purpose: "把口头承诺变成可核验事实。",
        evidenceArtifact: "职责、现金和权益条款清单。",
        timeBudget: "90 分钟",
        moneyBudget: "0 元",
        exitRule: "对方无法提供核心材料时，不进入不可逆承诺。",
        citations: [{ sourceId: sourceIds[0], use: "condition" }]
      }
    ],
    experiment: {
      title: "七天条件核验",
      keyQuestion: "这份邀请的核心条件能否被外部材料证实？",
      steps: [
        {
          label: "列出未知",
          purpose: "区分已经知道和仍需核验的条件。",
          evidenceArtifact: "未知清单。",
          timeBudget: "30 分钟",
          moneyBudget: "0 元",
          exitRule: "未知超过三项时，先不作最终决定。",
          citations: [{ sourceId: sourceIds[0], use: "condition" }]
        }
      ],
      resultInterpretation: {
        supported: "关键条件已被材料支持，可以带着新事实继续比较。",
        contradicted: "关键条件未被支持，应重新评估承诺上限。",
        inconclusive: "材料不足，先设定补充材料的截止日期。"
      },
      reminder: "这是实验建议，不是已执行的事实。"
    },
    explanation: {
      whatThisCanDo: "把来源中的分歧整理成可核验的问题和行动。",
      whatThisCannotDo: "不能预测结果、给出最佳路线或替你做决定。",
      nextReviewStep: "需要证据审核和人工确认后，才能进入正式推演。"
    },
    review: {
      status: "needs-evidence-review",
      reasons: ["需要确认每条引用是否贴合当前用户的处境。"]
    }
  };
}

describe("TASK-029 AI contracts", () => {
  it("accepts a bounded request with reviewed evidence", () => {
    expect(AiGenerationRequestSchema.safeParse(request()).success).toBe(true);
  });

  it("accepts only a review-gated candidate with provenance and citations", () => {
    expect(AiCandidateBundleSchema.safeParse(candidate()).success).toBe(true);
    expect(parseAiCandidateBundle(candidate(), sourceIds).review.status).toBe(
      "needs-evidence-review"
    );
  });

  it("rejects a candidate that cites a source outside the retrieval set", () => {
    const invalid = candidate();
    invalid.proposedActions[0].citations[0].sourceId = "zh-career-bridge-99";

    expect(() => parseAiCandidateBundle(invalid, sourceIds)).toThrow(
      "AI candidate referenced unavailable source"
    );
  });

  it("rejects direct state mutation fields rather than passing them to the game engine", () => {
    const invalid = { ...candidate(), stateDelta: { cashSafety: 100 } };
    expect(AiCandidateBundleSchema.safeParse(invalid).success).toBe(false);
  });

  it("makes failure and fallback explicit", () => {
    expect(
      AiFailureSchema.safeParse({
        contractVersion: 1,
        provenance: "ai-failure",
        code: "insufficient-evidence",
        retryable: false,
        userMessage: "现有来源不足，先补充可追溯的资料。",
        fallback: "manual-review",
        diagnostic: "fewer than three reviewed sources"
      }).success
    ).toBe(true);
  });
});
