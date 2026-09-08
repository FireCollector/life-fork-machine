import { describe, expect, it } from "vitest";
import { createDecisionBrief } from "@/features/decision-brief";
import { deriveZhihuQueries } from "@/server/evidence/zhihu-search";

const topics = [
  "稳定高薪工作还是跟领导创业，怎么选？",
  "要不要离开北京回成都工作？",
  "继续工作还是辞职读研？",
  "是否接受一份降薪但有成长的工作？",
  "要不要和对象一起买房？",
  "要不要转行做产品？",
  "要不要出国读硕士？",
  "要不要接一个高风险项目？",
  "要不要留在大厂？",
  "要不要创业做独立开发？"
];

describe("TASK-032 Zhihu evidence queries", () => {
  it("turns ten different decision briefs into distinct multi-angle queries", () => {
    const querySets = topics.map((topic) =>
      deriveZhihuQueries(createDecisionBrief(topic))
    );

    expect(querySets).toHaveLength(10);
    expect(
      querySets.every((queries) => queries.length >= 2 && queries.length <= 4)
    ).toBe(true);
    expect(
      querySets.every((queries) => new Set(queries).size === queries.length)
    ).toBe(true);
    expect(
      querySets.every((queries) =>
        queries.some((query) => query.includes("怎么选"))
      )
    ).toBe(true);
  });

  it("keeps the user's original dilemma while adding a choice-oriented query", () => {
    const queries = deriveZhihuQueries(createDecisionBrief(topics[0]));

    expect(queries[0]).toContain("稳定高薪工作");
    expect(queries.some((query) => query.includes("跟领导创业"))).toBe(true);
    expect(queries).toContain("稳定高薪工作 或 跟领导创业 怎么选");
  });
});
