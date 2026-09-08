import { z } from "zod";

import type { AiCandidateBundle, AiGenerationRequest } from "@/features/ai";
import type { DecisionBrief } from "@/features/decision-brief";
import {
  createEvidenceOrganizationRequest,
  type EvidenceSource
} from "@/features/evidence";
import { SourceIdSchema } from "@/features/game/schema";
import {
  CandidateScenarioPackSchema,
  type CandidateScenarioPack
} from "@/features/scenario-candidate";

const ShortText = z.string().trim().min(1).max(280);
const NarrativeText = z.string().trim().min(40).max(600);

export const NarrativeContextInputSchema = z
  .object({
    worldId: z.string().trim().min(1).max(80),
    sceneId: z.string().trim().min(1).max(100),
    actionId: z.string().trim().min(1).max(100)
  })
  .strict();

const NarrativeClueSchema = z
  .object({
    kind: z.enum(["support", "conflict", "inconclusive"]),
    text: ShortText,
    sourceIds: z.array(SourceIdSchema).min(1).max(4)
  })
  .strict();

export const NarrativeSnapshotSchema = z
  .object({
    version: z.literal(1),
    id: z.string().regex(/^narrative-[a-z0-9-]+$/),
    key: z.string().regex(/^snapshot-[a-z0-9-]+$/),
    packId: z.string().min(1),
    briefId: z.string().min(1),
    context: NarrativeContextInputSchema,
    provenance: z.enum(["ai-assisted", "rules-assisted"]),
    generatedAt: z.string().datetime(),
    narrative: NarrativeText,
    question: z
      .object({
        text: ShortText,
        reason: ShortText,
        sourceIds: z.array(SourceIdSchema).min(1).max(4)
      })
      .strict(),
    clues: z.tuple([
      NarrativeClueSchema.extend({ kind: z.literal("support") }),
      NarrativeClueSchema.extend({ kind: z.literal("conflict") }),
      NarrativeClueSchema.extend({ kind: z.literal("inconclusive") })
    ]),
    sourceIds: z.array(SourceIdSchema).min(3).max(12),
    disclosure: z.literal(
      "这是一段待审核的候选表达；来源只提供线索，不等于对结果的预测或建议。"
    )
  })
  .strict()
  .superRefine((snapshot, context) => {
    const allowed = new Set(snapshot.sourceIds);
    const refs = [
      ...snapshot.question.sourceIds,
      ...snapshot.clues.flatMap((clue) => clue.sourceIds)
    ];
    if (refs.some((sourceId) => !allowed.has(sourceId))) {
      context.addIssue({
        code: "custom",
        message: "narrative snapshot references an unavailable source",
        path: ["sourceIds"]
      });
    }
    if (/自杀|自伤|处方|诉讼|荐股|借贷/.test(JSON.stringify(snapshot))) {
      context.addIssue({
        code: "custom",
        message: "sensitive content requires manual handling",
        path: ["narrative"]
      });
    }
  });

export type NarrativeContextInput = z.infer<typeof NarrativeContextInputSchema>;
export type NarrativeSnapshot = z.infer<typeof NarrativeSnapshotSchema>;

export type ResolvedNarrativeContext = NarrativeContextInput & {
  worldIndex: number;
  actionIndex: number;
  act: 1 | 2 | 3;
  worldLabel: string;
  sceneTitle: string;
  actionLabel: string;
  actionDescription: string;
};

function compactId(value: string) {
  let hash = 2166136261;
  for (const character of value)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function shorten(value: string, maximum = 280) {
  return value.trim().slice(0, maximum);
}

function sourceAt(sources: EvidenceSource[], index: number) {
  return sources[index % sources.length];
}

export function resolveNarrativeContext(
  input: CandidateScenarioPack,
  context: NarrativeContextInput
): ResolvedNarrativeContext {
  const pack = CandidateScenarioPackSchema.parse(input);
  const parsedContext = NarrativeContextInputSchema.parse(context);
  const worldIndex = pack.worlds.findIndex(
    (world) => world.id === parsedContext.worldId
  );
  if (worldIndex < 0) throw new Error("候选路线不存在");
  const world = pack.worlds[worldIndex];
  const scene = world.acts.find((item) => item.id === parsedContext.sceneId);
  if (!scene) throw new Error("候选幕不存在");
  const actionIndex = scene.actions.findIndex(
    (item) => item.id === parsedContext.actionId
  );
  if (actionIndex < 0) throw new Error("候选动作不属于当前幕");
  const action = scene.actions[actionIndex];
  return {
    ...parsedContext,
    worldIndex,
    actionIndex,
    act: scene.act,
    worldLabel: world.label,
    sceneTitle: scene.title,
    actionLabel: action.label,
    actionDescription: action.description
  };
}

export function narrativeSnapshotKey(
  brief: DecisionBrief,
  pack: CandidateScenarioPack,
  context: NarrativeContextInput
) {
  const resolved = resolveNarrativeContext(pack, context);
  return `snapshot-${compactId(
    [
      "v1",
      brief.id,
      pack.id,
      resolved.worldId,
      resolved.sceneId,
      resolved.actionId
    ].join(":")
  )}`;
}

function questionFor(
  brief: DecisionBrief,
  pack: CandidateScenarioPack,
  resolved: ResolvedNarrativeContext,
  sources: EvidenceSource[]
) {
  const assumption =
    pack.assumptions[
      (resolved.worldIndex + resolved.act + resolved.actionIndex) %
        pack.assumptions.length
    ];
  const fallback =
    brief.unknowns[
      (resolved.worldIndex + resolved.actionIndex) % brief.unknowns.length
    ];
  return {
    text: shorten(
      `走“${resolved.worldLabel}”这一步，先确认：${assumption?.checkQuestion ?? fallback}`
    ),
    reason: shorten(
      `这一步要先核对“${resolved.actionLabel}”能不能拿到的现实材料，别急着把它当成结论。`
    ),
    sourceIds: assumption?.sourceIds ?? [
      sourceAt(sources, resolved.worldIndex).sourceId
    ]
  };
}

function baseSnapshot(
  brief: DecisionBrief,
  pack: CandidateScenarioPack,
  resolved: ResolvedNarrativeContext,
  sourceIds: string[],
  generatedAt: string
) {
  const key = narrativeSnapshotKey(brief, pack, {
    worldId: resolved.worldId,
    sceneId: resolved.sceneId,
    actionId: resolved.actionId
  });
  return {
    version: 1 as const,
    id: `narrative-${compactId(`${key}:${pack.id}`)}`,
    key,
    packId: pack.id,
    briefId: brief.id,
    context: {
      worldId: resolved.worldId,
      sceneId: resolved.sceneId,
      actionId: resolved.actionId
    },
    generatedAt,
    sourceIds,
    disclosure:
      "这是一段待审核的候选表达；来源只提供线索，不等于对结果的预测或建议。" as const
  };
}

export function createDynamicNarrativeRequest(
  brief: DecisionBrief,
  pack: CandidateScenarioPack,
  context: NarrativeContextInput,
  sources: EvidenceSource[]
): AiGenerationRequest {
  const resolved = resolveNarrativeContext(pack, context);
  const base = createEvidenceOrganizationRequest(
    brief,
    sources,
    `narrative-${compactId(
      `${narrativeSnapshotKey(brief, pack, context)}:${pack.generatedAt}`
    )}`
  );
  return {
    ...base,
    task: "explain-candidate",
    topic: {
      ...base.topic,
      rawQuestion: shorten(
        `${brief.originalQuestion}。当前候选路线是“${resolved.worldLabel}”，第 ${resolved.act} 幕“${resolved.sceneTitle}”，准备做“${resolved.actionLabel}”。请只整理这一步最该追问的假设和三类线索。`,
        800
      )
    }
  };
}

export function narrativeFromRules(
  brief: DecisionBrief,
  pack: CandidateScenarioPack,
  context: NarrativeContextInput,
  sources: EvidenceSource[],
  now = pack.generatedAt
): NarrativeSnapshot {
  const resolved = resolveNarrativeContext(pack, context);
  const sourceIds = pack.sourceIds;
  const first = sourceAt(sources, resolved.worldIndex);
  const second = sourceAt(sources, resolved.worldIndex + 1);
  const third = sourceAt(sources, resolved.worldIndex + 2);
  const question = questionFor(brief, pack, resolved, sources);
  return NarrativeSnapshotSchema.parse({
    ...baseSnapshot(brief, pack, resolved, sourceIds, now),
    provenance: "rules-assisted",
    narrative: shorten(
      `你走到“${resolved.worldLabel}”的第 ${resolved.act} 幕，准备做“${resolved.actionLabel}”。现在先别把这当成定局：这一步只花 ${pack.worlds[resolved.worldIndex].acts[resolved.act - 1].actions[resolved.actionIndex].timeBudgetMinutes} 分钟，目的是拿到一条能回看的现实信息，不替你预测会发生什么。拿不到也没关系，记录缺口，再决定要不要继续。`,
      600
    ),
    question,
    clues: [
      {
        kind: "support",
        text: shorten(
          `可用线索：${first.title} 是本次检索到的候选经验。打开原文，看看作者的条件是否真的和你接近。`
        ),
        sourceIds: [first.sourceId]
      },
      {
        kind: "conflict",
        text: shorten(
          `要留意的差别：${second.title} 讲的是另一种处境。条件不一样时，不能直接把它当成对你这条路的证明。`
        ),
        sourceIds: [second.sourceId]
      },
      {
        kind: "inconclusive",
        text: shorten(
          `还没弄清：${question.text}。先完成“${resolved.actionLabel}”，再用能留下的材料判断。`
        ),
        sourceIds: unique([...question.sourceIds, third.sourceId]).slice(0, 4)
      }
    ]
  });
}

export function narrativeFromAiCandidate(
  brief: DecisionBrief,
  pack: CandidateScenarioPack,
  context: NarrativeContextInput,
  sources: EvidenceSource[],
  candidate: AiCandidateBundle
): NarrativeSnapshot {
  const resolved = resolveNarrativeContext(pack, context);
  const question = questionFor(brief, pack, resolved, sources);
  const sourceIds = pack.sourceIds;
  const claimAt = (
    claims: typeof candidate.evidenceSynthesis.agreements,
    fallbackIndex: number
  ) => claims[fallbackIndex % claims.length];
  const support = claimAt(
    candidate.evidenceSynthesis.agreements,
    resolved.worldIndex
  );
  const conflict = claimAt(
    candidate.evidenceSynthesis.disagreements,
    resolved.actionIndex
  );
  const inconclusive = claimAt(
    candidate.evidenceSynthesis.applicabilityWarnings,
    resolved.act - 1
  );
  const refs = (claim: { citations: Array<{ sourceId: string }> }) =>
    unique(claim.citations.map((citation) => citation.sourceId));
  return NarrativeSnapshotSchema.parse({
    ...baseSnapshot(
      brief,
      pack,
      resolved,
      sourceIds,
      candidate.metadata.generatedAt
    ),
    provenance: "ai-assisted",
    narrative: shorten(
      `你在“${resolved.worldLabel}”里选了“${resolved.actionLabel}”。${candidate.topic.tension} 现在只看这一小步能否补上关键信息，不把它写成未来会怎样的结论。`,
      600
    ),
    question: {
      text: shorten(
        `走“${resolved.worldLabel}”这一步，先确认：${
          candidate.assumptions[
            (resolved.worldIndex + resolved.actionIndex) %
              candidate.assumptions.length
          ]?.checkQuestion ?? question.text
        }`
      ),
      reason: question.reason,
      sourceIds: question.sourceIds
    },
    clues: [
      {
        kind: "support",
        text: shorten(support.text),
        sourceIds: refs(support)
      },
      {
        kind: "conflict",
        text: shorten(conflict.text),
        sourceIds: refs(conflict)
      },
      {
        kind: "inconclusive",
        text: shorten(inconclusive.text),
        sourceIds: refs(inconclusive)
      }
    ]
  });
}

export function validateNarrativeSnapshot(
  input: NarrativeSnapshot,
  pack: CandidateScenarioPack
) {
  const snapshot = NarrativeSnapshotSchema.parse(input);
  const allowed = new Set(pack.sourceIds);
  const refs = [
    ...snapshot.question.sourceIds,
    ...snapshot.clues.flatMap((clue) => clue.sourceIds)
  ];
  if (snapshot.packId !== pack.id || refs.some((id) => !allowed.has(id))) {
    throw new Error("动态叙事与当前候选剧本或来源不匹配");
  }
  return {
    valid: true,
    clueCount: snapshot.clues.length,
    provenance: snapshot.provenance,
    publicationAllowed: false
  };
}
