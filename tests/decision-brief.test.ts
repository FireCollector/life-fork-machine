import { describe, expect, it } from "vitest";
import { confirmDecisionBrief, createDecisionBrief } from "@/features/game";

const hiddenTopics = [
  "要不要离开北京回成都？", "继续工作还是辞职读研？", "要不要跟领导创业？", "要不要换到另一个城市？", "是否接受一份降薪但有成长的工作？",
  "要不要和对象一起买房？", "要不要转行做产品？", "要不要出国读硕士？", "要不要接一个高风险项目？", "要不要留在大厂？",
  "要不要创业做独立开发？", "要不要搬去离父母近的城市？", "要不要延后结婚？", "要不要申请内部转岗？", "要不要接管理岗位？",
  "要不要全职做自媒体？", "要不要换一份离家更近的工作？", "要不要花一年准备考试？", "要不要接受异地工作？", "要不要卖房换城市？"
];

describe("TASK-031 decision brief", () => {
  it("turns 20 unseen ordinary topics into editable briefs", () => {
    const briefs = hiddenTopics.map(createDecisionBrief);
    expect(briefs).toHaveLength(20);
    expect(briefs.filter((brief) => brief.safety.status !== "stop")).toHaveLength(20);
    expect(briefs.every((brief) => brief.options.length >= 2 && brief.unknowns.length > 0)).toBe(true);
  });
  it("stops high-risk topics and never confirms them", () => {
    const brief = createDecisionBrief("我想自伤，该怎么办？");
    expect(brief.safety.status).toBe("stop");
    expect(confirmDecisionBrief(brief).confirmed).toBe(false);
  });
});
