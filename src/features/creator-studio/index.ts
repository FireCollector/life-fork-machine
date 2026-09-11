import { z } from "zod";

import {
  CandidateScenarioPackSchema,
  validateCandidateScenario,
  type CandidateScenarioPack
} from "@/features/scenario-candidate";
import { EvidenceSourceSchema } from "@/features/evidence";

export const CreatorRoleSchema = z.enum(["editor", "publisher", "admin"]);
export const ScenarioPublicationStatusSchema = z.enum([
  "draft",
  "in_review",
  "published",
  "retired"
]);

export type CreatorRole = z.infer<typeof CreatorRoleSchema>;
export type ScenarioPublicationStatus = z.infer<
  typeof ScenarioPublicationStatusSchema
>;

export const CreatorScenarioDraftSchema = z
  .object({
    scenarioKey: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{3,64}$/),
    changeReason: z.string().trim().min(4).max(240),
    sourceSnapshot: z.array(EvidenceSourceSchema).min(3).max(12),
    originalPack: CandidateScenarioPackSchema,
    editorPack: CandidateScenarioPackSchema
  })
  .strict();

export type CreatorScenarioDraft = z.infer<typeof CreatorScenarioDraftSchema>;

export type DraftValidation = {
  valid: boolean;
  issues: string[];
  summary: {
    worlds: number;
    acts: number;
    actions: number;
    sources: number;
  } | null;
};

function duplicate(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value)) return true;
    seen.add(value);
    return false;
  });
}

/**
 * This is deliberately stricter than the candidate schema: source IDs must
 * not only be structurally present, they cannot be duplicated or leave a
 * completely unused source in the published content catalog.
 */
export function validateCreatorDraft(input: unknown): DraftValidation {
  const parsed = CreatorScenarioDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.slice(0, 5).map((issue) => issue.message),
      summary: null
    };
  }
  const { editorPack } = parsed.data;
  const structural = validateCandidateScenario(editorPack);
  const usedSources = new Set([
    ...editorPack.worlds.flatMap((world) => [
      ...world.tradeoff.sourceIds,
      ...world.unknownToVerify.sourceIds,
      ...world.acts.flatMap((act) => [
        ...act.sourceIds,
        ...act.actions.flatMap((action) => action.sourceIds)
      ])
    ]),
    ...editorPack.assumptions.flatMap((item) => item.sourceIds),
    ...editorPack.experiment.steps.flatMap((item) => item.sourceIds)
  ]);
  const hasDuplicateActionsInScene = editorPack.worlds.some((world) =>
    world.acts.some(
      (act) => duplicate(act.actions.map((action) => action.label)).length
    )
  );
  const issues: string[] = [];
  if (!structural.valid) issues.push("动作 ID 重复，不能安全发布。");
  if (duplicate(editorPack.sourceIds).length)
    issues.push("来源列表有重复项，请保留唯一来源。");
  if (editorPack.sourceIds.some((sourceId) => !usedSources.has(sourceId)))
    issues.push("存在未被任何世界线、行动或实验引用的来源。");
  const snapshotIds = new Set(
    parsed.data.sourceSnapshot.map((source) => source.sourceId)
  );
  if (
    editorPack.sourceIds.some((sourceId) => !snapshotIds.has(sourceId)) ||
    snapshotIds.size !== editorPack.sourceIds.length
  )
    issues.push("来源快照与剧本引用不一致，无法核对原文入口。");
  if (hasDuplicateActionsInScene)
    issues.push("同一幕中至少两个行动使用了相同标题，请让行动更可区分。");

  return {
    valid: issues.length === 0,
    issues,
    summary: {
      worlds: structural.worldCount,
      acts: structural.actCount,
      actions: structural.actionCount,
      sources: structural.sourceCount
    }
  };
}

function primitive(value: unknown) {
  return value === null || typeof value !== "object";
}

export type PackChange = { path: string; before: string; after: string };

/** Compact, human-reviewable diff; it intentionally caps noisy array details. */
export function summarizePackChanges(
  original: CandidateScenarioPack,
  edited: CandidateScenarioPack,
  limit = 12
) {
  const changes: PackChange[] = [];
  function visit(before: unknown, after: unknown, path: string) {
    if (changes.length >= limit || Object.is(before, after)) return;
    if (primitive(before) || primitive(after)) {
      changes.push({
        path,
        before: String(before ?? "（空）"),
        after: String(after ?? "（空）")
      });
      return;
    }
    if (Array.isArray(before) || Array.isArray(after)) {
      const left = Array.isArray(before) ? before : [];
      const right = Array.isArray(after) ? after : [];
      if (left.length !== right.length) {
        changes.push({
          path,
          before: `${left.length} 项`,
          after: `${right.length} 项`
        });
      }
      for (
        let index = 0;
        index < Math.min(left.length, right.length);
        index += 1
      )
        visit(left[index], right[index], `${path}[${index + 1}]`);
      return;
    }
    const keys = new Set([
      ...Object.keys(before as Record<string, unknown>),
      ...Object.keys(after as Record<string, unknown>)
    ]);
    for (const key of keys)
      visit(
        (before as Record<string, unknown>)[key],
        (after as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key
      );
  }
  visit(original, edited, "");
  return changes;
}

export function canTransition(
  role: CreatorRole,
  from: ScenarioPublicationStatus,
  to: ScenarioPublicationStatus
) {
  if (role === "admin") return from !== to;
  if (role === "editor")
    return (
      (from === "draft" && to === "in_review") ||
      (from === "in_review" && to === "draft")
    );
  return (
    (from === "draft" && to === "in_review") ||
    (from === "in_review" && (to === "draft" || to === "published")) ||
    (from === "published" && to === "retired")
  );
}
