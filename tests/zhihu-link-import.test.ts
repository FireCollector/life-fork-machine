import { describe, expect, it } from "vitest";

import {
  applyCommunityLenses,
  communityLensPrompt,
  CommunityLensSelectionSchema
} from "@/features/community-lenses";
import {
  confirmDecisionBrief,
  createDecisionBrief
} from "@/features/decision-brief";
import type { EvidenceSource } from "@/features/evidence";
import { candidateFromRules } from "@/features/scenario-candidate";
import { ZhihuLinkSchema } from "@/features/zhihu-link-import";

const sources: EvidenceSource[] = ["01", "02", "03"].map((suffix) => ({
  sourceId: `zh-retrieved-link-${suffix}`,
  contentId: `link-${suffix}`,
  title: `不同处境的公开观点 ${suffix}`,
  author: `作者 ${suffix}`,
  url: `https://www.zhihu.com/answer/200${suffix}`,
  excerpt: `来源 ${suffix} 说明了一个不同的现实前提和需要核对的风险。`,
  voteUpCount: Number(suffix),
  rankingScore: Number(suffix),
  retrievedAt: "2026-09-09T08:00:00.000Z",
  queries: ["公开讨论"]
}));

describe("TASK-041 Zhihu link import", () => {
  it("normalizes supported public question, answer, and article URLs", () => {
    expect(
      ZhihuLinkSchema.parse("https://zhihu.com/question/12345?x=1")
    ).toMatchObject({
      url: "https://www.zhihu.com/question/12345",
      kind: "question",
      contentId: "12345"
    });
    expect(
      ZhihuLinkSchema.parse("https://www.zhihu.com/answer/23456/")
    ).toMatchObject({
      kind: "answer",
      contentId: "23456"
    });
    expect(
      ZhihuLinkSchema.parse("https://zhuanlan.zhihu.com/p/34567")
    ).toMatchObject({
      kind: "article",
      contentId: "34567"
    });
    expect(
      ZhihuLinkSchema.safeParse("https://example.com/question/12345").success
    ).toBe(false);
  });

  it("requires two distinct viewpoints and changes a candidate's assumptions and experiment input", () => {
    const brief = confirmDecisionBrief(
      createDecisionBrief("我要不要离开北京回成都工作？")
    );
    const selection = CommunityLensSelectionSchema.parse({
      resonatesSourceId: sources[0].sourceId,
      unsettlesSourceId: sources[1].sourceId
    });
    const withViews = applyCommunityLenses(brief, sources, selection);
    const baseline = candidateFromRules(
      brief,
      sources,
      "2026-09-09T08:00:00.000Z"
    );
    const changed = candidateFromRules(
      withViews,
      sources,
      "2026-09-09T08:00:00.000Z"
    );

    expect(withViews.assumptions[0]).toContain(sources[0].title);
    expect(withViews.unknowns[1]).toContain(sources[1].excerpt.slice(0, 40));
    expect(changed.assumptions[0].label).not.toBe(
      baseline.assumptions[0].label
    );
    expect(changed.experiment.keyQuestion).not.toBe(
      baseline.experiment.keyQuestion
    );
    expect(communityLensPrompt(sources, selection)).toContain(
      sources[0].sourceId
    );
    expect(communityLensPrompt(sources, selection)).toContain(
      sources[1].sourceId
    );
    expect(
      CommunityLensSelectionSchema.safeParse({
        resonatesSourceId: sources[0].sourceId,
        unsettlesSourceId: sources[0].sourceId
      }).success
    ).toBe(false);
  });
});
