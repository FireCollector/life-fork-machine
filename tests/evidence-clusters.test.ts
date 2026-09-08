import { describe, expect, it } from "vitest";

import { AiCandidateBundleSchema } from "@/features/ai";
import {
  createEvidenceOrganizationRequest,
  organizationFromAiCandidate,
  organizationFromSourceRules,
  reviseEvidenceCluster,
  type EvidenceSource
} from "@/features/evidence";
import {
  confirmDecisionBrief,
  createDecisionBrief
} from "@/features/decision-brief";

const sources: EvidenceSource[] = ["01", "02", "03"].map((suffix) => ({
  sourceId: `zh-retrieved-example-${suffix}`,
  contentId: `content-${suffix}`,
  title: `来源 ${suffix}`,
  author: `作者 ${suffix}`,
  url: `https://www.zhihu.com/question/100${suffix}`,
  excerpt: `来源 ${suffix} 的社区经验摘要，包含可供核对的处境和选择代价。`,
  voteUpCount: Number(suffix),
  rankingScore: Number(suffix),
  retrievedAt: "2026-09-08T12:00:00.000Z",
  queries: ["稳定高薪工作 跟领导创业 怎么选"]
}));

function cited(text: string, sourceId = sources[0].sourceId) {
  return {
    text,
    citations: [{ sourceId, use: "claim" as const }],
    confidence: "medium" as const,
    uncertainty: "这是他人的经验，仍需核对你自己的现金、时间和家庭条件。"
  };
}

function candidate() {
  return AiCandidateBundleSchema.parse({
    contractVersion: 1,
    provenance: "ai-generated-candidate",
    metadata: {
      provider: "deepseek-responses",
      model: "deepseek-v4-flash",
      generatedAt: "2026-09-08T12:00:00.000Z",
      promptVersion: "task-033.test"
    },
    topic: {
      normalizedQuestion: "稳定高薪工作还是跟领导创业，怎么选？",
      scope: "career",
      tension: "需要比较现金流、承诺兑现和承担风险的上限。",
      acknowledgedConstraints: ["现金流和投入上限"],
      missingInformation: ["权益和职责是否能写入材料"]
    },
    evidenceSynthesis: {
      agreements: [cited("多条来源都提醒先核对书面条件。")],
      disagreements: [
        cited("不同来源对何时承担风险的判断不同。", sources[1].sourceId)
      ],
      applicabilityWarnings: [
        cited("别人的现金缓冲不能直接套到你的家庭上。", sources[2].sourceId)
      ]
    },
    routes: [
      {
        id: "stay",
        label: "继续当前工作",
        tradeoff: cited("现金流更稳定，但机会窗口可能缩小。"),
        unknownToVerify: cited("当前岗位是否仍有目标成长。")
      },
      {
        id: "bridge",
        label: "先搭桥验证",
        tradeoff: cited("先核验条件再决定是否加码。"),
        unknownToVerify: cited("对方是否愿意给出书面材料。")
      }
    ],
    assumptions: [
      {
        label: "权益承诺可以兑现",
        whyItMatters: cited("它决定你能承受的风险上限。"),
        checkQuestion: "本周能否拿到书面的职责、现金和权益说明？"
      }
    ],
    proposedActions: [
      {
        label: "索取书面材料",
        purpose: "把口头承诺变成可核验事实。",
        evidenceArtifact: "职责、现金和权益条款清单。",
        timeBudget: "90 分钟",
        moneyBudget: "0 元",
        exitRule: "拿不到核心材料时，不进入不可逆承诺。",
        citations: [{ sourceId: sources[0].sourceId, use: "condition" }]
      }
    ],
    experiment: {
      title: "七天条件核验",
      keyQuestion: "核心条件能否被材料证实？",
      steps: [
        {
          label: "列出未知",
          purpose: "区分已知和未知条件。",
          evidenceArtifact: "未知清单。",
          timeBudget: "30 分钟",
          moneyBudget: "0 元",
          exitRule: "未知超过三项时先不作最终决定。",
          citations: [{ sourceId: sources[0].sourceId, use: "condition" }]
        }
      ],
      resultInterpretation: {
        supported: "条件已被材料支持，可以带着新事实继续比较。",
        contradicted: "条件未被支持，应重新评估承诺上限。",
        inconclusive: "材料不足，先设定补充材料的期限。"
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
      reasons: ["需要确认每条引用是否贴合当前处境。"]
    }
  });
}

describe("TASK-033 evidence organization", () => {
  it("uses only traceable retrieved sources when building an AI synthesis request", () => {
    const brief = confirmDecisionBrief(
      createDecisionBrief("稳定高薪工作还是跟领导创业，怎么选？")
    );
    const request = createEvidenceOrganizationRequest(
      brief,
      sources,
      "evidence-test-01"
    );

    expect(request.task).toBe("synthesize-evidence");
    expect(request.evidence.map((source) => source.id)).toEqual(
      sources.map((source) => source.sourceId)
    );
    expect(request.topic.confirmedConstraints).toEqual(brief.constraints);
  });

  it("creates three auditable clusters without adding uncited source IDs", () => {
    const brief = confirmDecisionBrief(
      createDecisionBrief("稳定高薪工作还是跟领导创业，怎么选？")
    );
    const organization = organizationFromAiCandidate(
      brief,
      sources,
      candidate()
    );
    const allowed = new Set(sources.map((source) => source.sourceId));

    expect(organization.clusters.map((cluster) => cluster.kind)).toEqual([
      "agreement",
      "disagreement",
      "applicability"
    ]);
    expect(
      organization.clusters.every((cluster) =>
        cluster.claims.every((claim) =>
          claim.sourceIds.every((sourceId) => allowed.has(sourceId))
        )
      )
    ).toBe(true);
    expect(
      organization.clusters.every(
        (cluster) =>
          cluster.suggestedActions.length > 0 &&
          cluster.conditions.length > 0 &&
          cluster.risks.length > 0
      )
    ).toBe(true);
  });

  it("records a human correction instead of silently overwriting the AI result", () => {
    const brief = confirmDecisionBrief(
      createDecisionBrief("稳定高薪工作还是跟领导创业，怎么选？")
    );
    const cluster = organizationFromAiCandidate(brief, sources, candidate())
      .clusters[0];
    const revised = reviseEvidenceCluster(
      cluster,
      {
        status: "approved",
        risks: ["先确定家庭现金缓冲，再判断能承受多大损失。"]
      },
      "审核者 A",
      "2026-09-08T13:00:00.000Z"
    );

    expect(revised.review.status).toBe("approved");
    expect(revised.review.revisions).toHaveLength(2);
    expect(revised.review.revisions.map((revision) => revision.field)).toEqual([
      "risks",
      "status"
    ]);
  });

  it("labels the current-source fallback instead of pretending an AI result exists", () => {
    const brief = confirmDecisionBrief(
      createDecisionBrief("稳定高薪工作还是跟领导创业，怎么选？")
    );
    const fallback = organizationFromSourceRules(
      brief,
      sources,
      "2026-09-08T14:00:00.000Z"
    );

    expect(fallback.provenance).toBe("rules-assisted");
    expect(
      fallback.clusters
        .flatMap((cluster) => cluster.claims)
        .every((claim) => claim.sourceIds.length > 0)
    ).toBe(true);
    expect(
      fallback.clusters
        .flatMap((cluster) => cluster.claims)
        .every((claim) => claim.text.startsWith("候选摘要："))
    ).toBe(true);
  });
});
