import { describe, expect, it } from "vitest";

import {
  confirmDecisionBrief,
  createDecisionBrief
} from "@/features/decision-brief";
import {
  CandidateScenarioPackSchema,
  candidateFromRules,
  validateCandidateScenario
} from "@/features/scenario-candidate";
import type { EvidenceSource } from "@/features/evidence";

const sources: EvidenceSource[] = ["01", "02", "03"].map((suffix) => ({
  sourceId: `zh-retrieved-pack-${suffix}`,
  contentId: `content-${suffix}`,
  title: `来源 ${suffix}`,
  author: `作者 ${suffix}`,
  url: `https://www.zhihu.com/question/100${suffix}`,
  excerpt: `来源 ${suffix} 的社区经验摘要，包含一个可追溯的现实选择条件。`,
  voteUpCount: Number(suffix),
  rankingScore: Number(suffix),
  retrievedAt: "2026-09-08T12:00:00.000Z",
  queries: ["稳定高薪工作 跟领导创业 怎么选"]
}));

describe("TASK-034 candidate ScenarioPack", () => {
  it("builds three distinct worlds with three auditable acts and actions", () => {
    const brief = confirmDecisionBrief(
      createDecisionBrief("稳定高薪工作还是跟领导创业，怎么选？")
    );
    const pack = candidateFromRules(brief, sources, "2026-09-08T16:00:00.000Z");
    const report = validateCandidateScenario(pack);

    expect(pack.provenance).toBe("rules-assisted");
    expect(pack.worlds).toHaveLength(3);
    expect(
      pack.worlds.every(
        (world) => world.acts.map((scene) => scene.act).join(",") === "1,2,3"
      )
    ).toBe(true);
    expect(
      pack.worlds.every((world) =>
        world.acts.every((scene) => scene.actions.length === 3)
      )
    ).toBe(true);
    expect(report).toMatchObject({
      valid: true,
      worldCount: 3,
      actCount: 9,
      actionCount: 27,
      publicationAllowed: false
    });
  });

  it("rejects a candidate that smuggles in a source not present in this retrieval", () => {
    const brief = confirmDecisionBrief(
      createDecisionBrief("稳定高薪工作还是跟领导创业，怎么选？")
    );
    const pack = candidateFromRules(brief, sources, "2026-09-08T16:00:00.000Z");
    const invalid = structuredClone(pack);
    invalid.worlds[0].acts[0].actions[0].sourceIds = [
      "zh-retrieved-foreign-99"
    ];

    expect(CandidateScenarioPackSchema.safeParse(invalid).success).toBe(false);
  });
});
