import { describe, expect, it } from "vitest";
import {
  createCollaborationLink,
  formatContribution,
  parseCollaborationInvite
} from "@/features/collaboration";
const invite = {
  version: 1 as const,
  topic: "换城市",
  question: "最该核对什么？",
  expiresOn: "2026-10-10",
  context: ["只比较两个可逆方案"]
};
describe("TASK-043 controlled collaboration", () => {
  it("shares only the explicit whitelist context", () => {
    const link = createCollaborationLink(invite, "https://example.com");
    const parsed = parseCollaborationInvite(new URL(link).hash);
    expect(parsed).toEqual(invite);
    expect(link).not.toContain("session");
  });
  it("keeps fact, view and support contributions visibly distinct", () => {
    expect(formatContribution({ kind: "fact", text: "合同还没签" })).toBe(
      "【事实补充】合同还没签"
    );
    expect(formatContribution({ kind: "view", text: "我会先等" })).toContain(
      "个人观点"
    );
  });
});
