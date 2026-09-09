import { z } from "zod";

import type { DecisionBrief } from "@/features/decision-brief";
import type { EvidenceSource } from "@/features/evidence";
import { SourceIdSchema } from "@/features/game/schema";

/**
 * Two deliberately different community views selected by the person using the
 * product. They are inputs for a candidate, not labels for the sources and not
 * a vote on which route is correct.
 */
export const CommunityLensSelectionSchema = z
  .object({
    resonatesSourceId: SourceIdSchema,
    unsettlesSourceId: SourceIdSchema
  })
  .strict()
  .refine((value) => value.resonatesSourceId !== value.unsettlesSourceId, {
    message: "认同的观点和让你不舒服的观点需要来自两条不同来源。"
  });

export type CommunityLensSelection = z.infer<
  typeof CommunityLensSelectionSchema
>;

export function communityLensSources(
  sources: EvidenceSource[],
  selection: CommunityLensSelection
) {
  const byId = new Map(sources.map((source) => [source.sourceId, source]));
  const resonates = byId.get(selection.resonatesSourceId);
  const unsettles = byId.get(selection.unsettlesSourceId);
  if (!resonates || !unsettles)
    throw new Error("所选观点不在本次公开检索结果中，不能带入推演。 ");
  return { resonates, unsettles };
}

/** Keeps the original decision intact while making the chosen perspectives
 * auditable inputs for the next candidate-generation request. */
export function applyCommunityLenses(
  brief: DecisionBrief,
  sources: EvidenceSource[],
  selection?: CommunityLensSelection
): DecisionBrief {
  if (!selection) return brief;
  const { resonates, unsettles } = communityLensSources(sources, selection);
  const concise = (value: string) => value.replace(/\s+/g, " ").slice(0, 110);
  return {
    ...brief,
    assumptions: [
      `我认同的经验是否适用于自己：${concise(resonates.title)}`,
      `让我不舒服的反例是否会发生：${concise(unsettles.title)}`,
      ...brief.assumptions
    ].slice(0, 6),
    unknowns: [
      `核对认同观点的前提：${concise(resonates.excerpt)}`,
      `核对反例暴露的风险：${concise(unsettles.excerpt)}`,
      ...brief.unknowns
    ].slice(0, 6)
  };
}

/** A bounded, source-labelled context block for the AI candidate request. */
export function communityLensPrompt(
  sources: EvidenceSource[],
  selection?: CommunityLensSelection
) {
  if (!selection) return "";
  const { resonates, unsettles } = communityLensSources(sources, selection);
  const concise = (value: string) => value.replace(/\s+/g, " ").slice(0, 150);
  return [
    "用户选中的社区视角（不是结论，需通过来源核对）：",
    `- 最像我 [${resonates.sourceId}]：${concise(resonates.title)}；${concise(resonates.excerpt)}`,
    `- 让我不舒服 [${unsettles.sourceId}]：${concise(unsettles.title)}；${concise(unsettles.excerpt)}`,
    "请将它们转为可核验的前提与反例风险，而不是推荐其中一条路线。"
  ].join("\n");
}
