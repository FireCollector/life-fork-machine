import { describe, expect, it } from "vitest";

import {
  generateTopicDraft,
  TopicDraftSchema
} from "../src/features/game";

describe("D21-D23 topic lab", () => {
  it("switches to the curated graduate-school preset", () => {
    const draft = generateTopicDraft("现在应该继续工作，还是辞职准备读研？");
    expect(draft.id).toBe("graduate-school-or-work");
    expect(draft.worlds.map((world) => world.name)).toEqual([
      "继续工作",
      "全力读研",
      "边工作边准备"
    ]);
    expect(draft.experiment.title).toBe("七天读研价值核验");
    expect(TopicDraftSchema.safeParse(draft).success).toBe(true);
  });

  it("generates a safe, review-gated structure for an arbitrary topic", () => {
    const draft = generateTopicDraft("要不要离开大城市回老家？");
    expect(draft.title).toBe("要不要离开大城市回老家？");
    expect(draft.worlds).toHaveLength(3);
    expect(draft.assumptions).toHaveLength(3);
    expect(draft.experiment.steps).toHaveLength(3);
    expect(draft.safety.status).toBe("needs-review");
  });

  it("rejects an empty topic", () => {
    expect(() => generateTopicDraft("   ")).toThrow(
      "请先输入一个想认真想清楚的问题"
    );
  });
});
