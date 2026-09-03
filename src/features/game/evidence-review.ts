import { z } from "zod";

import { SourceIdSchema, type SourceCard } from "./schema";
import type { TopicDraft } from "./topic-draft";

export const ReviewDecisionSchema = z.enum(["pending", "approved", "rejected"]);
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

const ReviewCandidateSchema = z
  .object({
    sourceId: SourceIdSchema,
    decision: ReviewDecisionSchema,
    note: z.string().max(240).optional()
  })
  .strict();

export const ReviewPackageSchema = z
  .object({
    id: z.string().min(1),
    draftId: z.string().min(1),
    question: z.string().min(1),
    query: z.string().min(1),
    retrieval: z.literal("zhihu_open_platform_snapshot"),
    version: z.number().int().positive(),
    status: z.enum(["reviewing", "approved", "published"]),
    candidates: z.array(ReviewCandidateSchema).min(3),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .strict();

export type ReviewPackage = z.infer<typeof ReviewPackageSchema>;

export interface ReviewSummary {
  approved: number;
  pending: number;
  rejected: number;
  canPublish: boolean;
}

function hash(value: string) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

export function createReviewPackage(
  draft: TopicDraft,
  sourceCards: SourceCard[],
  now = new Date().toISOString(),
  query = `${draft.normalizedQuestion} 真实经验 风险 核验`
): ReviewPackage {
  return ReviewPackageSchema.parse({
    id: `review-${hash(`${draft.id}:${draft.normalizedQuestion}`)}`,
    draftId: draft.id,
    question: draft.normalizedQuestion,
    query,
    retrieval: "zhihu_open_platform_snapshot",
    version: 1,
    status: "reviewing",
    candidates: sourceCards.map((source) => ({
      sourceId: source.id,
      decision: "pending"
    })),
    createdAt: now,
    updatedAt: now
  });
}

export function createReviewVersion(
  previous: ReviewPackage,
  draft: TopicDraft,
  sourceCards: SourceCard[],
  now = new Date().toISOString(),
  query = previous.query
): ReviewPackage {
  return ReviewPackageSchema.parse({
    ...createReviewPackage(draft, sourceCards, now, query),
    id: `${previous.id}-v${previous.version + 1}`,
    version: previous.version + 1
  });
}

export function summarizeReviewPackage(pkg: ReviewPackage): ReviewSummary {
  const approved = pkg.candidates.filter(
    (candidate) => candidate.decision === "approved"
  ).length;
  const pending = pkg.candidates.filter(
    (candidate) => candidate.decision === "pending"
  ).length;
  const rejected = pkg.candidates.length - approved - pending;
  return {
    approved,
    pending,
    rejected,
    canPublish: approved >= 3 && pending === 0
  };
}

export function updateReviewDecision(
  pkg: ReviewPackage,
  sourceId: string,
  decision: ReviewDecision,
  note = "",
  now = new Date().toISOString()
): ReviewPackage {
  if (pkg.status === "published") {
    throw new Error("已发布版本已锁定，请生成新版本后再修改");
  }
  if (!pkg.candidates.some((candidate) => candidate.sourceId === sourceId)) {
    throw new Error(`素材 ${sourceId} 不在当前审核包中`);
  }
  return ReviewPackageSchema.parse({
    ...pkg,
    status: "reviewing",
    candidates: pkg.candidates.map((candidate) =>
      candidate.sourceId === sourceId
        ? { ...candidate, decision, note: note.trim() || undefined }
        : candidate
    ),
    updatedAt: now
  });
}

export function publishReviewPackage(
  pkg: ReviewPackage,
  now = new Date().toISOString()
): ReviewPackage {
  const summary = summarizeReviewPackage(pkg);
  if (!summary.canPublish) {
    throw new Error("至少审核通过 3 条素材，并处理完所有待审核项后才能发布");
  }
  return ReviewPackageSchema.parse({
    ...pkg,
    status: "published",
    updatedAt: now
  });
}
