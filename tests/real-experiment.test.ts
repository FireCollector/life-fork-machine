import { describe, expect, it } from "vitest";

import {
  advanceExperiment,
  buildExperimentExport,
  createSession,
  demoContent,
  getExperimentAvailability,
  loadSession,
  rescheduleExperiment,
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
