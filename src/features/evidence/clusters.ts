import { z } from "zod";

import type { AiCandidateBundle, AiGenerationRequest } from "@/features/ai";
import {
  DecisionBriefSchema,
  type DecisionBrief
} from "@/features/decision-brief";
import { SourceIdSchema } from "@/features/game/schema";

const ShortText = z.string().trim().min(1).max(280);
const Paragraph = z.string().trim().min(1).max(1_200);

export const EvidenceSourceSchema = z
  .object({
    sourceId: SourceIdSchema,
    contentId: z.string().trim().min(1),
    title: ShortText,
    author: ShortText,
    url: z.string().url(),
    excerpt: Paragraph,
    voteUpCount: z.number().int().nonnegative(),
    rankingScore: z.number(),
    retrievedAt: z.string().datetime(),
    queries: z.array(ShortText).min(1).max(4)
  })
  .strict();

export const EvidenceClaimSchema = z
  .object({
    id: z.string().regex(/^claim-[a-z0-9-]+$/),
    text: Paragraph,
    sourceIds: z.array(SourceIdSchema).min(1).max(4),
    confidence: z.enum(["high", "medium", "low"]),
    uncertainty: ShortText
  })
  .strict();

export const EvidenceClusterSchema = z
  .object({
    id: z.string().regex(/^cluster-[a-z0-9-]+$/),
    title: ShortText,
    kind: z.enum(["agreement", "disagreement", "applicability"]),
    claims: z.array(EvidenceClaimSchema).min(1).max(4),
    conditions: z.array(ShortText).min(1).max(6),
    risks: z.array(ShortText).min(1).max(6),
    suggestedActions: z
      .array(
        z
          .object({
            text: ShortText,
            sourceIds: z.array(SourceIdSchema).min(1).max(4)
          })
          .strict()
      )
      .min(1)
      .max(3),
    rationale: z
      .object({
        method: z.enum(["ai-assisted", "rules-assisted"]),
        explanation: ShortText,
        model: z.string().trim().min(1).max(120).optional()
      })
      .strict(),
    review: z
      .object({
        status: z.enum(["pending", "approved", "rejected"]),
        revisions: z
          .array(
            z
              .object({
                field: z.enum([
                  "title",
                  "conditions",
                  "risks",
                  "suggestedActions",
                  "status"
                ]),
                before: z.string(),
                after: z.string(),
                reviewer: ShortText,
                editedAt: z.string().datetime()
              })
              .strict()
          )
          .max(30)
      })
      .strict()
  })
  .strict();

export const EvidenceOrganizationSchema = z
  .object({
    version: z.literal(1),
    provenance: z.enum(["ai-assisted", "rules-assisted"]),
    generatedAt: z.string().datetime(),
    briefId: z.string().min(1),
    sourceIds: z.array(SourceIdSchema).min(3).max(12),
    clusters: z.array(EvidenceClusterSchema).length(3),
    disclaimer: z.literal("这是来源整理，不是对你的决定的推荐或事实结论。")
  })
  .strict()
  .superRefine((organization, context) => {
    const allowed = new Set(organization.sourceIds);
    for (const cluster of organization.clusters) {
      for (const claim of cluster.claims) {
        for (const sourceId of claim.sourceIds) {
          if (!allowed.has(sourceId)) {
            context.addIssue({
              code: "custom",
              message: "观点引用了本次检索以外的来源",
              path: ["clusters", cluster.id, "claims", claim.id, "sourceIds"]
            });
          }
        }
      }
    }
  });

export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;
export type EvidenceCluster = z.infer<typeof EvidenceClusterSchema>;
export type EvidenceOrganization = z.infer<typeof EvidenceOrganizationSchema>;

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function candidateClaim(
  kind: EvidenceCluster["kind"],
  index: number,
  claim: {
    text: string;
    citations: Array<{ sourceId: string }>;
    confidence: "high" | "medium" | "low";
    uncertainty: string;
  }
) {
  return {
    id: `claim-${kind}-${index + 1}`,
    text: claim.text,
    sourceIds: unique(claim.citations.map((citation) => citation.sourceId)),
    confidence: claim.confidence,
    uncertainty: claim.uncertainty
  };
}

function actionItems(candidate: AiCandidateBundle) {
  return candidate.proposedActions.slice(0, 3).map((action) => ({
    text: action.label,
    sourceIds: unique(action.citations.map((citation) => citation.sourceId))
  }));
}

export function createEvidenceOrganizationRequest(
  brief: DecisionBrief,
  sources: EvidenceSource[],
  requestId: string
): AiGenerationRequest {
  const parsedBrief = DecisionBriefSchema.parse(brief);
  const evidence = z.array(EvidenceSourceSchema).min(3).max(12).parse(sources);

  return {
    contractVersion: 1,
    requestId,
    task: "synthesize-evidence",
    topic: {
      rawQuestion: parsedBrief.originalQuestion,
      locale: "zh-CN",
      decisionDeadline: parsedBrief.deadline,
      confirmedConstraints: parsedBrief.constraints
    },
    evidence: evidence.map((source) => ({
      id: source.sourceId,
      title: source.title,
      author: source.author,
      claim: source.excerpt,
      conditions: ["这是社区经验候选，需结合提问者现实条件核验"],
      stance: "conditional" as const,
      url: source.url
    })),
    instruction:
      "Return a reviewable candidate. Do not predict outcomes, recommend a best route, or mutate game state."
  };
}

export function organizationFromAiCandidate(
  brief: DecisionBrief,
  sources: EvidenceSource[],
  candidate: AiCandidateBundle
): EvidenceOrganization {
  const definitions: Array<{
    kind: EvidenceCluster["kind"];
    title: string;
    claims: typeof candidate.evidenceSynthesis.agreements;
    risks: string[];
  }> = [
    {
      kind: "agreement",
      title: "多条经历共同提醒的事",
      claims: candidate.evidenceSynthesis.agreements,
      risks: [
        "共同出现不等于对每个人都成立；仍要核对你的现金、时间和关系成本。"
      ]
    },
    {
      kind: "disagreement",
      title: "来源之间没有统一答案的地方",
      claims: candidate.evidenceSynthesis.disagreements,
      risks: ["把有分歧的经验压成一个结论，容易忽略真正的取舍。"]
    },
    {
      kind: "applicability",
      title: "这些经验放到你身上前要先核对",
      claims: candidate.evidenceSynthesis.applicabilityWarnings,
      risks: ["作者的行业、家庭责任或现金储备不同，照搬可能放大风险。"]
    }
  ];

  return EvidenceOrganizationSchema.parse({
    version: 1,
    provenance: "ai-assisted",
    generatedAt: candidate.metadata.generatedAt,
    briefId: brief.id,
    sourceIds: sources.map((source) => source.sourceId),
    clusters: definitions.map((definition) => ({
      id: `cluster-${definition.kind}`,
      title: definition.title,
      kind: definition.kind,
      claims: definition.claims.map((claim, index) =>
        candidateClaim(definition.kind, index, claim)
      ),
      conditions: unique(definition.claims.map((claim) => claim.uncertainty)),
      risks: definition.risks,
      suggestedActions: actionItems(candidate),
      rationale: {
        method: "ai-assisted",
        explanation:
          "按来源引用把相同提醒、不同看法和适用边界分开，未引用的内容不会进入观点簇。",
        model: candidate.metadata.model
      },
      review: { status: "pending", revisions: [] }
    })),
    disclaimer: "这是来源整理，不是对你的决定的推荐或事实结论。"
  });
}

/**
 * A transparent fallback: it exposes current source excerpts and the user's
 * own verification needs, rather than pretending a failed AI call is advice.
 */
export function organizationFromSourceRules(
  brief: DecisionBrief,
  sources: EvidenceSource[],
  now = new Date().toISOString()
): EvidenceOrganization {
  const parsedSources = z
    .array(EvidenceSourceSchema)
    .min(3)
    .max(12)
    .parse(sources);
  const conditions = brief.constraints.length
    ? brief.constraints.map((constraint) => constraint.text).slice(0, 6)
    : ["先补齐自己可承受的时间、金钱或关系边界。"];
  const risks = brief.unknowns.slice(0, 6);
  const definitions: Array<{
    kind: EvidenceCluster["kind"];
    title: string;
    explanation: string;
    sourceOffset: number;
  }> = [
    {
      kind: "agreement",
      title: "先逐条核对的经验摘要",
      explanation:
        "规则按本次检索顺序展示候选摘要；它没有声称这些作者已经得出同一个结论。",
      sourceOffset: 0
    },
    {
      kind: "disagreement",
      title: "需要并列保留的不同处境",
      explanation:
        "规则把不同来源并列，提醒审核者不要把多篇个人经历压成一个综合答案。",
      sourceOffset: 1
    },
    {
      kind: "applicability",
      title: "套用前要对照自己的条件",
      explanation:
        "规则将候选来源与当前简报的约束和未知项放在一起，供人工判断是否适用。",
      sourceOffset: 2
    }
  ];

  return EvidenceOrganizationSchema.parse({
    version: 1,
    provenance: "rules-assisted",
    generatedAt: now,
    briefId: brief.id,
    sourceIds: parsedSources.map((source) => source.sourceId),
    clusters: definitions.map((definition) => {
      const clusterSources = Array.from(
        { length: Math.min(3, parsedSources.length) },
        (_, index) =>
          parsedSources[
            (definition.sourceOffset + index) % parsedSources.length
          ]
      );
      return {
        id: `cluster-${definition.kind}`,
        title: definition.title,
        kind: definition.kind,
        claims: clusterSources.map((source, index) => ({
          id: `claim-${definition.kind}-${index + 1}`,
          text: `候选摘要：${source.excerpt.slice(0, 220)}`,
          sourceIds: [source.sourceId],
          confidence: "low" as const,
          uncertainty:
            "这是未完成 AI 语义整理的当前检索候选；请打开原文确认作者的完整条件和语境。"
        })),
        conditions,
        risks,
        suggestedActions: brief.unknowns.slice(0, 3).map((unknown, index) => ({
          text: `先核对：${unknown}`,
          sourceIds: [clusterSources[index % clusterSources.length].sourceId]
        })),
        rationale: {
          method: "rules-assisted" as const,
          explanation: definition.explanation
        },
        review: { status: "pending" as const, revisions: [] }
      };
    }),
    disclaimer: "这是来源整理，不是对你的决定的推荐或事实结论。"
  });
}

export function reviseEvidenceCluster(
  cluster: EvidenceCluster,
  patch: Pick<
    Partial<EvidenceCluster>,
    "title" | "conditions" | "risks" | "suggestedActions"
  > & { status?: EvidenceCluster["review"]["status"] },
  reviewer: string,
  now = new Date().toISOString()
): EvidenceCluster {
  const { status, ...contentPatch } = patch;
  const revisions = [...cluster.review.revisions];
  const record = (
    field: "title" | "conditions" | "risks" | "suggestedActions" | "status",
    before: unknown,
    after: unknown
  ) => {
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      revisions.push({
        field,
        before: JSON.stringify(before),
        after: JSON.stringify(after),
        reviewer: reviewer.trim(),
        editedAt: now
      });
    }
  };
  record("title", cluster.title, contentPatch.title ?? cluster.title);
  record(
    "conditions",
    cluster.conditions,
    contentPatch.conditions ?? cluster.conditions
  );
  record("risks", cluster.risks, contentPatch.risks ?? cluster.risks);
  record(
    "suggestedActions",
    cluster.suggestedActions,
    contentPatch.suggestedActions ?? cluster.suggestedActions
  );
  record("status", cluster.review.status, status ?? cluster.review.status);

  return EvidenceClusterSchema.parse({
    ...cluster,
    ...contentPatch,
    review: { status: status ?? cluster.review.status, revisions }
  });
}
