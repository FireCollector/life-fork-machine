import { describe, expect, it } from "vitest";

import {
  advanceExperiment,
  acceptExperimentAdjustment,
  buildExperimentExport,
  customizeExperimentAdjustment,
  createSession,
  demoContent,
  getExperimentAvailability,
  loadSession,
  rescheduleExperiment,
  revertExperimentAdjustment,
  selectWorld,
  sessionStorageKey,
  skipExperimentDay,
  startExperiment,
  stopExperiment,
  type CalibrationAnswers
} from "../src/features/game";

const calibration: CalibrationAnswers = {
  runway: "12-24",
  sharedRisk: "self",
  primaryFear: "financial-loss",
  primaryGoal: "growth",
  uncertaintyStyle: "validate-first"
};

function completedSession() {
  let session = selectWorld(
    createSession(calibration, demoContent.scenario, {
      id: "real-experiment-test",
      now: "2026-09-01T09:00:00.000Z"
    }),
    demoContent.scenario,
    "stay",
    "2026-09-01T09:00:00.000Z"
  );
  // This task only needs a completed session; the chosen actions are valid
  // because the experiment engine is independent from route generation.
  session = {
    ...session,
    status: "completed" as const,
    actionHistory: [
      "stay-1-written-promotion",
      "stay-2-market-interviews",
      "stay-3-side-incubation"
    ]
  };
  return session;
}

describe("TASK-038 real seven-day experiment", () => {
  it("locks later days by calendar date instead of trusting a refresh or route", () => {
    const experimentId = "test-market-return";
    let session = startExperiment(
      completedSession(),
      demoContent.outcomes,
      experimentId,
      "2026-09-01T09:00:00.000Z",
      { mode: "real" }
    );

    session = advanceExperiment(
      session,
      demoContent.outcomes,
      experimentId,
      "2026-09-01T10:00:00.000Z",
      {
        choice: "约一位招聘方聊真实岗位",
        note: "对方约了下周沟通",
        evidenceType: "conversation",
        feeling: "clearer",
        nextStep: "整理岗位要求"
      }
    ).session;

    expect(session.experimentRun).toMatchObject({
      mode: "real",
      day: 1,
      nextAvailableOn: "2026-09-02",
      events: [
        expect.objectContaining({
          occurredOn: "2026-09-01",
          evidenceType: "conversation",
          feeling: "clearer"
        })
      ]
    });
    expect(
      getExperimentAvailability(
        session,
        experimentId,
        "2026-09-01T23:00:00.000Z"
      )
    ).toEqual(
      expect.objectContaining({ available: false, availableOn: "2026-09-02" })
    );
    expect(() =>
      advanceExperiment(
        session,
        demoContent.outcomes,
        experimentId,
        "2026-09-01T23:00:00.000Z"
      )
    ).toThrowError(expect.objectContaining({ code: "EXPERIMENT_DATE_LOCKED" }));
  });

  it("supports rescheduling, skipping, stopping, and a user-owned export", () => {
    const experimentId = "test-market-return";
    let session = startExperiment(
      completedSession(),
      demoContent.outcomes,
      experimentId,
      "2026-09-01T09:00:00.000Z",
      { mode: "real" }
    );
    session = rescheduleExperiment(
      session,
      experimentId,
      "2026-09-03",
      "2026-09-01T09:01:00.000Z"
    );
    expect(
      getExperimentAvailability(
        session,
        experimentId,
        "2026-09-02T12:00:00.000Z"
      ).available
    ).toBe(false);

    session = skipExperimentDay(
      session,
      demoContent.outcomes,
      experimentId,
      "2026-09-03T12:00:00.000Z",
      "家里有突发安排"
    ).session;
    expect(session.experimentRun?.events?.[0]).toMatchObject({
      status: "skipped",
      occurredOn: "2026-09-03"
    });

    session = stopExperiment(
      session,
      experimentId,
      "本周工作突发，无法保证记录质量",
      "2026-09-03T12:01:00.000Z"
    );
    expect(session.experimentRun).toMatchObject({ status: "stopped" });

    const exported = buildExperimentExport(
      session,
      demoContent.scenario,
      demoContent.outcomes
    );
    expect(exported).toMatchObject({
      format: "life-fork-machine.experiment.v1",
      scenario: { id: demoContent.scenario.scenarioId },
      experiment: {
        status: "stopped",
        entries: [expect.objectContaining({ status: "skipped" })]
      }
    });
  });

  it("migrates an old local run without turning it into a completed seven-day record", () => {
    const session = completedSession();
    const legacy = {
      ...session,
      experimentRun: {
        experimentId: "test-market-return",
        status: "active",
        day: 1,
        events: [{ day: 1, choice: "旧记录" }],
        evidenceScore: 12
      }
    };
    window.localStorage.setItem(
      sessionStorageKey(session.id),
      JSON.stringify(legacy)
    );

    const restored = loadSession(window.localStorage, session.id);
    expect(restored?.experimentRun).toMatchObject({
      mode: "real",
      status: "active",
      day: 1,
      startedOn: "2026-09-01"
    });
  });
});

describe("TASK-039 adaptive experiment", () => {
  it("creates a traceable next-day suggestion from an explicit blocker, then lets the user undo it", () => {
    const experimentId = "test-market-return";
    let session = startExperiment(
      completedSession(),
      demoContent.outcomes,
      experimentId,
      "2026-09-01T09:00:00.000Z",
      { mode: "real" }
    );

    session = advanceExperiment(
      session,
      demoContent.outcomes,
      experimentId,
      "2026-09-01T10:00:00.000Z",
      {
        choice: "向对方确认岗位要求",
        note: "消息已发出，但当天没有回复。",
        evidenceType: "conversation",
        evidenceSignal: "insufficient",
        blocker: "no_response",
        feeling: "steady"
      }
    ).session;

    const suggestion = session.experimentRun?.adjustments?.[0];
    expect(suggestion).toMatchObject({
      sourceDay: 1,
      targetDay: 2,
      reason: "no_response",
      blocker: "no_response",
      status: "suggested"
    });
    expect(suggestion?.explanation).toContain("信息暂时缺失");

    session = acceptExperimentAdjustment(
      session,
      experimentId,
      suggestion!.id,
      "2026-09-01T10:01:00.000Z"
    );
    expect(session.experimentRun?.adjustments?.[0]).toMatchObject({
      status: "accepted",
      appliedAction: suggestion?.recommendedAction
    });

    session = revertExperimentAdjustment(
      session,
      experimentId,
      suggestion!.id,
      "2026-09-01T10:02:00.000Z"
    );
    expect(session.experimentRun?.adjustments?.[0]).toMatchObject({
      status: "reverted"
    });
  });

  it("changes the next action differently when evidence conflicts with the initial assumption", () => {
    const experimentId = "test-market-return";
    let session = startExperiment(
      completedSession(),
      demoContent.outcomes,
      experimentId,
      "2026-09-01T09:00:00.000Z",
      { mode: "real" }
    );
    session = advanceExperiment(
      session,
      demoContent.outcomes,
      experimentId,
      "2026-09-01T10:00:00.000Z",
      {
        choice: "核对岗位描述",
        note: "岗位职责和先前承诺不一致。",
        evidenceType: "document",
        evidenceSignal: "contradicted",
        feeling: "clearer"
      }
    ).session;

    const suggestion = session.experimentRun?.adjustments?.[0];
    expect(suggestion).toMatchObject({ reason: "evidence_contradicted" });
    expect(suggestion?.recommendedAction).toContain("暂停扩大承诺");

    session = customizeExperimentAdjustment(
      session,
      experimentId,
      suggestion!.id,
      "先约一次 20 分钟沟通，只确认职责边界。",
      "2026-09-01T10:01:00.000Z"
    );
    expect(session.experimentRun?.adjustments?.[0]).toMatchObject({
      status: "customized",
      appliedAction: "先约一次 20 分钟沟通，只确认职责边界。"
    });
    expect(
      buildExperimentExport(session, demoContent.scenario, demoContent.outcomes)
        .experiment?.adjustments
    ).toEqual([
      expect.objectContaining({
        reason: "evidence_contradicted",
        status: "customized"
      })
    ]);
  });
});
