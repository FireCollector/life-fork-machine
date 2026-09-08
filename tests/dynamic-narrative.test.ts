import { describe, expect, it } from "vitest";

import {
  confirmDecisionBrief,
  createDecisionBrief
} from "@/features/decision-brief";
import {
  createDynamicNarrativeRequest,
  narrativeFromRules,
  NarrativeSnapshotSchema,
  resolveNarrativeContext,
  validateNarrativeSnapshot
} from "@/features/dynamic-narrative";
import type { EvidenceSource } from "@/features/evidence";
import { candidateFromRules } from "@/features/scenario-candidate";

const sources: EvidenceSource[] = ["01", "02", "03"].map((suffix) => ({
  sourceId: `zh-retrieved-narrative-${suffix}`,
  contentId: `content-${suffix}`,
  title: `真实经验来源 ${suffix}`,
  author: `作者 ${suffix}`,
  url: `https://www.zhihu.com/question/200${suffix}`,
  excerpt: `来源 ${suffix} 的社区经验摘要，保留一项需要回到原文核对的现实条件。`,
  voteUpCount: Number(suffix),
  rankingScore: Number(suffix),
  retrievedAt: "2026-09-08T12:00:00.000Z",
  queries: ["稳定高薪工作 跟领导创业 怎么选"]
}));

function fixture() {
  const brief = confirmDecisionBrief(
    createDecisionBrief("稳定高薪工作还是跟领导创业，怎么选？")
  );
  const pack = candidateFromRules(brief, sources, "2026-09-08T16:00:00.000Z");
  return { brief, pack };
}

describe("TASK-035 dynamic narrative snapshots", () => {
  it("changes the context and targeted question when route or action changes", () => {
    const { brief, pack } = fixture();
    const first = pack.worlds[0].acts[0];
    const alternate = pack.worlds[1].acts[1];
    const snapshotA = narrativeFromRules(
      brief,
      pack,
      {
        worldId: pack.worlds[0].id,
        sceneId: first.id,
        actionId: first.actions[0].id
      },
      sources,
      "2026-09-08T18:00:00.000Z"
    );
    const snapshotB = narrativeFromRules(
      brief,
      pack,
      {
        worldId: pack.worlds[1].id,
        sceneId: alternate.id,
        actionId: alternate.actions[1].id
      },
      sources,
      "2026-09-08T18:00:00.000Z"
    );

    expect(snapshotA.key).not.toBe(snapshotB.key);
    expect(snapshotA.narrative).not.toBe(snapshotB.narrative);
    expect(snapshotA.question.text).not.toBe(snapshotB.question.text);
  });

  it("keeps an identical snapshot key and candidate text for the same saved context", () => {
    const { brief, pack } = fixture();
    const scene = pack.worlds[2].acts[0];
    const context = {
      worldId: pack.worlds[2].id,
      sceneId: scene.id,
      actionId: scene.actions[2].id
    };
    const first = narrativeFromRules(brief, pack, context, sources);
    const again = narrativeFromRules(brief, pack, context, sources);

    expect(first.key).toBe(again.key);
    expect(first.narrative).toBe(again.narrative);
    expect(validateNarrativeSnapshot(first, pack)).toMatchObject({
      valid: true,
      clueCount: 3,
      publicationAllowed: false
    });
  });

  it("uses all three evidence states without inventing a source or an outcome", () => {
    const { brief, pack } = fixture();
    const scene = pack.worlds[0].acts[0];
    const snapshot = narrativeFromRules(
      brief,
      pack,
      {
        worldId: pack.worlds[0].id,
        sceneId: scene.id,
        actionId: scene.actions[0].id
      },
      sources
    );

    expect(snapshot.provenance).toBe("rules-assisted");
    expect(snapshot.clues.map((clue) => clue.kind)).toEqual([
      "support",
      "conflict",
      "inconclusive"
    ]);
    expect(snapshot.clues.flatMap((clue) => clue.sourceIds)).toEqual(
      expect.arrayContaining(pack.sourceIds)
    );
    expect(snapshot.narrative).toMatch(/不替你预测|不替你定方向/);
  });

  it("rejects a context that mixes a world with another world's action", () => {
    const { pack } = fixture();
    const foreignScene = pack.worlds[1].acts[0];
    expect(() =>
      resolveNarrativeContext(pack, {
        worldId: pack.worlds[0].id,
        sceneId: foreignScene.id,
        actionId: foreignScene.actions[0].id
      })
    ).toThrow("候选幕不存在");
  });

  it("rejects a snapshot with a source outside the retrieval that made the pack", () => {
    const { brief, pack } = fixture();
    const scene = pack.worlds[0].acts[0];
    const snapshot = narrativeFromRules(
      brief,
      pack,
      {
        worldId: pack.worlds[0].id,
        sceneId: scene.id,
        actionId: scene.actions[0].id
      },
      sources
    );
    const invalid = structuredClone(snapshot);
    invalid.clues[0].sourceIds = ["zh-retrieved-foreign-99"];

    expect(NarrativeSnapshotSchema.safeParse(invalid).success).toBe(false);
  });

  it("keeps the AI request in the existing candidate-only contract", () => {
    const { brief, pack } = fixture();
    const scene = pack.worlds[0].acts[0];
    const request = createDynamicNarrativeRequest(
      brief,
      pack,
      {
        worldId: pack.worlds[0].id,
        sceneId: scene.id,
        actionId: scene.actions[0].id
      },
      sources
    );

    expect(request.task).toBe("explain-candidate");
    expect(request.topic.rawQuestion).toContain("当前候选路线");
    expect(request.instruction).toContain("Do not predict outcomes");
  });
});
