import { describe, expect, it } from "vitest";

import {
  canTransition,
  summarizePackChanges,
  validateCreatorDraft
} from "@/features/creator-studio";
import {
  confirmDecisionBrief,
  createDecisionBrief
} from "@/features/decision-brief";
import type { EvidenceSource } from "@/features/evidence";
import { candidateFromRules } from "@/features/scenario-candidate";

const sources: EvidenceSource[] = ["01", "02", "03"].map((suffix) => ({
  sourceId: `zh-retrieved-studio-${suffix}`,
  contentId: `content-${suffix}`,
  title: `来源 ${suffix}`,
  author: `作者 ${suffix}`,
  url: `https://www.zhihu.com/question/200${suffix}`,
  excerpt: `来源 ${suffix} 的社区经验摘要，保留原文入口和适用条件。`,
  voteUpCount: Number(suffix),
  rankingScore: Number(suffix),
  retrievedAt: "2026-09-11T12:00:00.000Z",
  queries: ["工作还是读研"]
}));

function draft() {
  const pack = candidateFromRules(
    confirmDecisionBrief(createDecisionBrief("继续工作还是辞职读研？")),
    sources,
    "2026-09-11T12:00:00.000Z"
  );
  return {
    scenarioKey: "work-or-graduate-school",
    changeReason: "核对来源与实验退出条件。",
    sourceSnapshot: sources,
    originalPack: pack,
    editorPack: structuredClone(pack)
  };
}

describe("TASK-045 Creator Studio governance", () => {
  it("allows a complete candidate plus its source snapshot through the publishing gate", () => {
    const result = validateCreatorDraft(draft());
    expect(result).toMatchObject({
      valid: true,
      summary: { worlds: 3, acts: 9, actions: 27, sources: 3 }
    });
  });

  it("blocks a pack whose cited source is absent from the retained source snapshot", () => {
    const value = draft();
    value.sourceSnapshot[2] = {
      ...value.sourceSnapshot[2],
      sourceId: "zh-retrieved-studio-99"
    };
    const result = validateCreatorDraft(value);
    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toContain("来源快照");
  });

  it("keeps publication authority separate from editorial authority", () => {
    expect(canTransition("editor", "draft", "in_review")).toBe(true);
    expect(canTransition("editor", "in_review", "published")).toBe(false);
    expect(canTransition("publisher", "in_review", "published")).toBe(true);
    expect(canTransition("publisher", "published", "retired")).toBe(true);
  });

  it("shows concise field-level changes instead of hiding human edits", () => {
    const value = draft();
    value.editorPack.title = "继续工作还是辞职读研：编辑版";
    const changes = summarizePackChanges(value.originalPack, value.editorPack);
    expect(changes.some((change) => change.path === "title")).toBe(true);
  });
});
