import { z } from "zod";

import type { AiCandidateBundle } from "@/features/ai";
import { type DecisionBrief } from "@/features/decision-brief";
import { type EvidenceSource } from "@/features/evidence";
import { SourceIdSchema } from "@/features/game/schema";

const Text = z.string().trim().min(1).max(280);
const SourceRefs = z.array(SourceIdSchema).min(1).max(4);
const CandidateActionSchema = z
  .object({
    id: z.string().regex(/^action-[a-z0-9-]+$/),
    label: Text,
    description: Text,
    timeBudgetMinutes: z.number().int().min(5).max(480),
    moneyBudgetCny: z.number().int().min(0).max(2_000),
    sourceIds: SourceRefs
  })
  .strict();
const CandidateSceneSchema = z
  .object({
    id: z.string().regex(/^scene-[a-z0-9-]+$/),
    act: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    title: Text,
    premise: Text,
    sourceIds: SourceRefs,
    actions: z.array(CandidateActionSchema).length(3)
  })
  .strict();
const CandidateWorldSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{1,48}$/),
    label: Text,
    tradeoff: z.object({ text: Text, sourceIds: SourceRefs }).strict(),
    unknownToVerify: z.object({ text: Text, sourceIds: SourceRefs }).strict(),
    acts: z.array(CandidateSceneSchema).length(3)
  })
  .strict();

export const CandidateScenarioPackSchema = z
  .object({
    version: z.literal(2),
    id: z.string().regex(/^candidate-[a-z0-9-]+$/),
    provenance: z.enum(["ai-assisted", "rules-assisted"]),
    generatedAt: z.string().datetime(),
    briefId: z.string().min(1),
    title: Text,
    disclaimer: z.literal(
      "这是待审核的情景推演草稿，不是现实预测、职业建议或已发布内容。"
    ),
    sourceIds: z.array(SourceIdSchema).min(3).max(12),
    worlds: z.array(CandidateWorldSchema).length(3),
    assumptions: z
      .array(
        z
          .object({ label: Text, checkQuestion: Text, sourceIds: SourceRefs })
          .strict()
      )
      .min(1)
      .max(4),
    experiment: z
      .object({
        title: Text,
        keyQuestion: Text,
        steps: z
          .array(
            z
              .object({
                label: Text,
                timeBudgetMinutes: z.number().int().min(5).max(480),
                moneyBudgetCny: z.number().int().min(0).max(2_000),
                sourceIds: SourceRefs
              })
              .strict()
          )
          .min(1)
          .max(3),
        exitRule: Text
      })
      .strict(),
    review: z
      .object({
        status: z.literal("needs-editor-review"),
        blockers: z.array(Text).min(2).max(6),
        version: z.number().int().positive()
      })
      .strict()
  })
  .strict()
  .superRefine((pack, context) => {
    const allowed = new Set(pack.sourceIds);
    const usedIds = new Set<string>();
    for (const world of pack.worlds) {
      if (usedIds.has(world.id))
        context.addIssue({
          code: "custom",
          message: "world IDs must be unique",
          path: ["worlds"]
        });
      usedIds.add(world.id);
      if (world.acts.map((scene) => scene.act).join(",") !== "1,2,3")
        context.addIssue({
          code: "custom",
          message: "acts must be 1,2,3",
          path: ["worlds", world.id, "acts"]
        });
      for (const sourceId of [
        ...world.tradeoff.sourceIds,
        ...world.unknownToVerify.sourceIds,
        ...world.acts.flatMap((scene) => [
          ...scene.sourceIds,
          ...scene.actions.flatMap((action) => action.sourceIds)
        ])
      ]) {
        if (!allowed.has(sourceId))
          context.addIssue({
            code: "custom",
            message: "candidate references an unavailable source",
            path: ["worlds", world.id]
          });
      }
    }
    for (const sourceId of [
      ...pack.assumptions.flatMap((assumption) => assumption.sourceIds),
      ...pack.experiment.steps.flatMap((step) => step.sourceIds)
    ]) {
      if (!allowed.has(sourceId)) {
        context.addIssue({
          code: "custom",
          message: "candidate references an unavailable source",
          path: ["sourceIds"]
        });
      }
    }
    if (/自杀|自伤|处方|诉讼|荐股|借贷/.test(JSON.stringify(pack))) {
      context.addIssue({
        code: "custom",
        message: "sensitive content requires manual handling",
        path: ["review"]
      });
    }
  });

export type CandidateScenarioPack = z.infer<typeof CandidateScenarioPackSchema>;

const stages = [
  {
    title: "先把条件摊开",
    premise: "先区分已经确认的事实、口头承诺和仍需核验的信息。"
  },
  {
    title: "用小动作换信息",
    premise: "在不做不可逆承诺前，先用可退出的小行动验证关键前提。"
  },
  {
    title: "带着新证据复盘",
    premise: "把收集到的材料与最初假设对照，再决定是否进入下一阶段。"
  }
] as const;

function compactId(value: string) {
  let hash = 2166136261;
  for (const character of value)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function budgets(index: number) {
  return { timeBudgetMinutes: [30, 60, 90][index % 3], moneyBudgetCny: 0 };
}

function sourceAt(sources: EvidenceSource[], index: number) {
  return sources[index % sources.length];
}

function actionsFor(
  worldId: string,
  act: number,
  sources: EvidenceSource[],
  actions:
    | Array<{
        label: string;
        purpose: string;
        citations: Array<{ sourceId: string }>;
      }>
    | undefined
) {
  return Array.from({ length: 3 }, (_, index) => {
    const source = sourceAt(sources, act + index);
    const action = actions?.[index % (actions.length || 1)];
    const budget = budgets(index);
    return {
      id: `action-${worldId}-${act}-${index + 1}`,
      label:
        action?.label ??
        ["列出还不知道的事", "找一份可核验材料", "写下投入上限"][index],
      description:
        action?.purpose ?? "这一步只用于补充现实信息，不代表已经做出最终选择。",
      ...budget,
      sourceIds: action
        ? unique(action.citations.map((citation) => citation.sourceId))
        : [source.sourceId]
    };
  });
}

function packId(brief: DecisionBrief) {
  return `candidate-${compactId(`${brief.id}:${brief.normalizedQuestion}`)}`;
}

export function candidateFromAi(
  brief: DecisionBrief,
  sources: EvidenceSource[],
  candidate: AiCandidateBundle
): CandidateScenarioPack {
  const routes = [...candidate.routes];
  while (routes.length < 3) {
    const source = sourceAt(sources, routes.length);
    const fallbackId = routes.some((route) => route.id === "verify-bridge")
      ? `verify-bridge-${routes.length + 1}`
      : "verify-bridge";
    routes.push({
      id: fallbackId,
      label: "先搭桥验证",
      tradeoff: {
        text: "先用小范围验证换取信息，再决定是否加大投入。",
        citations: [{ sourceId: source.sourceId, use: "condition" }],
        confidence: "low",
        uncertainty: "这是用于补齐第三条候选路线的规则草稿，仍需人工审核。"
      },
      unknownToVerify: {
        text: brief.unknowns[0],
        citations: [{ sourceId: source.sourceId, use: "condition" }],
        confidence: "low",
        uncertainty: "需要回到当前来源和用户约束确认。"
      }
    });
  }
  return CandidateScenarioPackSchema.parse({
    version: 2,
    id: packId(brief),
    provenance: "ai-assisted",
    generatedAt: candidate.metadata.generatedAt,
    briefId: brief.id,
    title: candidate.topic.normalizedQuestion,
    disclaimer:
      "这是待审核的情景推演草稿，不是现实预测、职业建议或已发布内容。",
    sourceIds: sources.map((source) => source.sourceId),
    worlds: routes.slice(0, 3).map((route, worldIndex) => ({
      id: route.id,
      label: route.label,
      tradeoff: {
        text: route.tradeoff.text,
        sourceIds: unique(
          route.tradeoff.citations.map((citation) => citation.sourceId)
        )
      },
      unknownToVerify: {
        text: route.unknownToVerify.text,
        sourceIds: unique(
          route.unknownToVerify.citations.map((citation) => citation.sourceId)
        )
      },
      acts: stages.map((stage, index) => ({
        id: `scene-${route.id}-${index + 1}`,
        act: (index + 1) as 1 | 2 | 3,
        title: stage.title,
        premise: `情景推演：${stage.premise}`,
        sourceIds: [sourceAt(sources, worldIndex + index).sourceId],
        actions: actionsFor(
          route.id,
          index + 1,
          sources,
          candidate.proposedActions
        )
      }))
    })),
    assumptions: candidate.assumptions.map((assumption) => ({
      label: assumption.label,
      checkQuestion: assumption.checkQuestion,
      sourceIds: unique(
        assumption.whyItMatters.citations.map((citation) => citation.sourceId)
      )
    })),
    experiment: {
      title: candidate.experiment.title,
      keyQuestion: candidate.experiment.keyQuestion,
      steps: candidate.experiment.steps.map((step, index) => ({
        label: step.label,
        ...budgets(index),
        sourceIds: unique(step.citations.map((citation) => citation.sourceId))
      })),
      exitRule: candidate.experiment.steps[0].exitRule
    },
    review: {
      status: "needs-editor-review",
      blockers: [
        "需要确认每条来源是否适用于当前议题。",
        "需要人工确认情景动作、预算和退出规则后才能发布。"
      ],
      version: 1
    }
  });
}

export function candidateFromRules(
  brief: DecisionBrief,
  sources: EvidenceSource[],
  now = new Date().toISOString()
): CandidateScenarioPack {
  const routeLabels = [brief.options[0], brief.options[1], "先搭桥验证"];
  return CandidateScenarioPackSchema.parse({
    version: 2,
    id: packId(brief),
    provenance: "rules-assisted",
    generatedAt: now,
    briefId: brief.id,
    title: brief.normalizedQuestion,
    disclaimer:
      "这是待审核的情景推演草稿，不是现实预测、职业建议或已发布内容。",
    sourceIds: sources.map((source) => source.sourceId),
    worlds: routeLabels.map((label, worldIndex) => ({
      id: ["hold", "change", "verify"][worldIndex],
      label,
      tradeoff: {
        text: "这是用于比较代价的情景草稿；请回到来源和个人约束判断是否成立。",
        sourceIds: [sourceAt(sources, worldIndex).sourceId]
      },
      unknownToVerify: {
        text: brief.unknowns[worldIndex % brief.unknowns.length],
        sourceIds: [sourceAt(sources, worldIndex + 1).sourceId]
      },
      acts: stages.map((stage, index) => ({
        id: `scene-${["hold", "change", "verify"][worldIndex]}-${index + 1}`,
        act: (index + 1) as 1 | 2 | 3,
        title: stage.title,
        premise: `情景推演：${stage.premise}`,
        sourceIds: [sourceAt(sources, worldIndex + index).sourceId],
        actions: actionsFor(
          ["hold", "change", "verify"][worldIndex],
          index + 1,
          sources,
          undefined
        )
      }))
    })),
    assumptions: brief.assumptions.slice(0, 4).map((label, index) => ({
      label,
      checkQuestion: brief.unknowns[index % brief.unknowns.length],
      sourceIds: [sourceAt(sources, index).sourceId]
    })),
    experiment: {
      title: "七天最小验证草稿",
      keyQuestion: brief.unknowns[0],
      steps: brief.unknowns.slice(0, 3).map((unknown, index) => ({
        label: `核对：${unknown}`,
        ...budgets(index),
        sourceIds: [sourceAt(sources, index).sourceId]
      })),
      exitRule: "未拿到关键材料或超过投入上限时，暂停推进并重新定义问题。"
    },
    review: {
      status: "needs-editor-review",
      blockers: [
        "实时 AI 候选不可用，当前仅是规则辅助草稿。",
        "所有世界线、动作和实验都需人工审核后才能发布。"
      ],
      version: 1
    }
  });
}

export function validateCandidateScenario(pack: CandidateScenarioPack) {
  const parsed = CandidateScenarioPackSchema.parse(pack);
  const actionIds = parsed.worlds.flatMap((world) =>
    world.acts.flatMap((scene) => scene.actions.map((action) => action.id))
  );
  return {
    valid: new Set(actionIds).size === actionIds.length,
    worldCount: parsed.worlds.length,
    actCount: parsed.worlds.reduce((sum, world) => sum + world.acts.length, 0),
    actionCount: actionIds.length,
    sourceCount: parsed.sourceIds.length,
    publicationAllowed: false
  };
}
