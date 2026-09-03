import { describe, expect, it } from "vitest";

import {
  createReviewPackage,
  createReviewVersion,
  demoContent,
  generateTopicDraft,
  publishReviewPackage,
  summarizeReviewPackage,
  updateReviewDecision
} from "../src/features/game";

const NOW = "2026-09-03T10:00:00.000Z";

describe("D25–D26 evidence review pipeline", () => {
  it("creates a pending package from traceable Zhihu sources", () => {
    const draft = generateTopicDraft("稳定高薪工作与跟领导创业如何选择？");
    const pkg = createReviewPackage(draft, demoContent.sourceCards, NOW);

    expect(pkg.retrieval).toBe("zhihu_open_platform_snapshot");
    expect(pkg.version).toBe(1);
    expect(summarizeReviewPackage(pkg)).toMatchObject({
      approved: 0,
      pending: demoContent.sourceCards.length,
      canPublish: false
    });
  });

  it("requires all decisions and three approvals before publishing", () => {
    const draft = generateTopicDraft("稳定高薪工作与跟领导创业如何选择？");
    let pkg = createReviewPackage(draft, demoContent.sourceCards, NOW);

    expect(() => publishReviewPackage(pkg, NOW)).toThrow("至少审核通过 3 条素材");
    for (const [index, source] of demoContent.sourceCards.entries()) {
      pkg = updateReviewDecision(
        pkg,
        source.id,
        index < 3 ? "approved" : "rejected",
        index < 3 ? "与当前议题直接相关" : "只作背景，不进入正式剧本",
        NOW
      );
    }
    expect(summarizeReviewPackage(pkg).canPublish).toBe(true);
    expect(publishReviewPackage(pkg, NOW).status).toBe("published");
  });

  it("locks published versions and creates a new review version", () => {
    const draft = generateTopicDraft("稳定高薪工作与跟领导创业如何选择？");
    const pkg = createReviewPackage(draft, demoContent.sourceCards, NOW);
    const next = createReviewVersion(pkg, draft, demoContent.sourceCards, NOW);

    expect(next.version).toBe(2);
    const published = publishReviewPackage(
      demoContent.sourceCards.reduce(
        (current, source, index) =>
          updateReviewDecision(current, source.id, index < 3 ? "approved" : "rejected", "", NOW),
        pkg
      ),
      NOW
    );
    expect(() => updateReviewDecision(published, demoContent.sourceCards[0].id, "rejected")).toThrow(
      "已发布版本已锁定"
    );
  });
});

