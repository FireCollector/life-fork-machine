import { beforeEach, describe, expect, it } from "vitest";

import {
  CALIBRATION_STORAGE_KEY,
  createDecisionBranch,
  createSession,
  deleteAllDecisionArchives,
  completeDecisionReview,
  demoContent,
  getDecisionRecordHints,
  listDecisionArchives,
  saveSession,
  scheduleDecisionReview,
  selectWorld,
  type CalibrationAnswers
} from "../src/features/game";

const calibration: CalibrationAnswers = {
  runway: "12-24",
  sharedRisk: "self",
  primaryFear: "financial-loss",
  primaryGoal: "growth",
  uncertaintyStyle: "validate-first"
};

function completedSession(id = "archive-parent") {
  let session = selectWorld(
    createSession(calibration, demoContent.scenario, {
      id,
      now: "2026-09-01T09:00:00.000Z"
    }),
    demoContent.scenario,
    "bridge",
    "2026-09-01T09:00:00.000Z"
  );
  session = {
    ...session,
    status: "completed" as const,
    actionHistory: [
      "bridge-1-evidence-sprint",
      "bridge-2-conditional-join",
      "bridge-3-validated-join"
    ],
    ledger: {
      ...session.ledger,
      costs: ["担心收入下降会影响家庭预算"]
    },
    experimentRun: {
      experimentId: "test-market-return",
      mode: "real" as const,
      status: "active" as const,
      day: 1,
      startedOn: "2026-09-01",
      nextAvailableOn: "2026-09-02",
      events: [
        {
          day: 1,
          choice: "确认岗位要求",
          status: "completed" as const,
          evidenceSignal: "insufficient" as const
        }
      ],
      adjustments: [
        {
          id: "adjustment-day-1",
          sourceDay: 1,
          targetDay: 2,
          reason: "information_missing" as const,
          originalAction: "补岗位信息",
          recommendedAction: "确认一个关键缺口",
          explanation: "信息不足，不急着下结论。",
          status: "suggested" as const,
          createdAt: "2026-09-01T09:00:00.000Z"
        }
      ]
    }
  };
  return session;
}

describe("TASK-040 decision archive", () => {
  beforeEach(() => window.localStorage.clear());

  it("schedules and completes a review without overwriting the original decision", () => {
    const original = completedSession();
    const scheduled = scheduleDecisionReview(original, "seven_day", {
      now: "2026-09-01T10:00:00.000Z"
    });
    expect(scheduled.decisionReviews?.[0]).toMatchObject({
      kind: "seven_day",
      dueOn: "2026-09-08",
      status: "scheduled"
    });

    const reviewed = completeDecisionReview(
      scheduled,
      scheduled.decisionReviews![0].id,
      {
        whatHappened: "招聘方给了明确的岗位范围。",
        differenceFromThen: "当初担心没有退路，后来发现可以先保留外部机会。"
      },
      "2026-09-08T10:00:00.000Z"
    );
    expect(reviewed.decisionReviews?.[0]).toMatchObject({
      status: "completed",
      whatHappened: "招聘方给了明确的岗位范围。"
    });
    expect(reviewed.ledger).toEqual(original.ledger);
    expect(reviewed.actionHistory).toEqual(original.actionHistory);
  });

  it("creates a new branch for later information while leaving the parent untouched", () => {
    const parent = completedSession();
    const branch = createDecisionBranch(
      parent,
      "客户确认能在下月签约，但回款周期为 60 天。",
      { id: "archive-branch", now: "2026-09-10T09:00:00.000Z" }
    );

    expect(branch).toMatchObject({
      id: "archive-branch",
      decisionLineage: {
        rootSessionId: parent.id,
        parentSessionId: parent.id,
        newInformation: "客户确认能在下月签约，但回款周期为 60 天。"
      }
    });
    expect(branch.ledger.facts.at(-1)).toContain("客户确认能在下月签约");
    expect(parent.decisionLineage).toBeUndefined();
    expect(parent.ledger.facts).not.toContain("客户确认能在下月签约");
    expect(getDecisionRecordHints(branch)).toContain(
      "这是基于新信息创建的分支版本；它保留父版本，方便比较当时依据和后来变化。"
    );
  });

  it("lists only personal completed decisions and deletes all of them without touching other local data", () => {
    const first = completedSession("archive-first");
    const second = completedSession("archive-second");
    const demo = completedSession("demo-bridge-v1");
    saveSession(window.localStorage, first);
    saveSession(window.localStorage, second);
    saveSession(window.localStorage, demo);
    window.localStorage.setItem(CALIBRATION_STORAGE_KEY, "kept");

    expect(
      listDecisionArchives(window.localStorage).map((session) => session.id)
    ).toEqual(["archive-first", "archive-second"]);
    expect(deleteAllDecisionArchives(window.localStorage)).toBe(2);
    expect(listDecisionArchives(window.localStorage)).toHaveLength(0);
    expect(window.localStorage.getItem(CALIBRATION_STORAGE_KEY)).toBe("kept");
    expect(
      window.localStorage.getItem("life-fork-machine:session:v1:demo-bridge-v1")
    ).not.toBeNull();
  });
});
