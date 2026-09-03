import { describe, expect, it } from "vitest";

import {
  applyAction,
  applyAssumptionCheck,
  applyAssumptionBlast,
  applyStateDelta,
  advanceExperiment,
  calculateOutcome,
  createSession,
  demoContent,
  forkSession,
  getCalibrationDelta,
  getCurrentScene,
  selectExperiment,
  selectWorld,
  startExperiment,
  validateLedger,
  type CalibrationAnswers,
  type GameSession,
  type StateDelta,
  type StateVector,
  type WorldId
} from "../src/features/game";

const NOW = "2026-09-01T10:00:00.000Z";
const calibration: CalibrationAnswers = {
  runway: "12-24",
  sharedRisk: "partner",
  primaryFear: "financial-loss",
  primaryGoal: "autonomy",
  uncertaintyStyle: "validate-first"
};

function freshSession() {
  return createSession(calibration, demoContent.scenario, {
    id: "test-session",
    seed: 42,
    now: NOW
  });
}

function playStayRoute() {
  let session = selectWorld(freshSession(), demoContent.scenario, "stay", NOW);
  session = applyAction(
    session,
    demoContent.scenario,
    "stay-1-written-promotion",
    NOW
  ).session;
  session = applyAction(
    session,
    demoContent.scenario,
    "stay-2-market-interviews",
    NOW
  ).session;
  session = applyAssumptionBlast(
    session,
    demoContent.outcomes,
    "equivalent-job-not-available",
    NOW
  ).session;
  return applyAction(
    session,
    demoContent.scenario,
    "stay-3-side-incubation",
    NOW
  ).session;
}

describe("D02 deterministic game engine", () => {
  it("creates a reproducible session without selecting a world", () => {
    const session = freshSession();

    expect(session).toMatchObject({
      id: "test-session",
      seed: 42,
      status: "forging",
      act: 1,
      actionHistory: [],
      state: demoContent.scenario.commonBaseline
    });
    expect(session.selectedWorld).toBeUndefined();
  });

  it("combines all five calibration answers into one explicit delta", () => {
    expect(getCalibrationDelta(calibration)).toEqual({
      cashSafety: 2,
      careerOptionality: 8,
      growthSlope: 0,
      relationshipCapital: -2,
      wellbeingLoad: 4,
      valueAlignment: 3
    });
  });

  it("selects a world and exposes its first scene", () => {
    const session = selectWorld(
      freshSession(),
      demoContent.scenario,
      "bridge",
      NOW
    );

    expect(session.status).toBe("playing");
    expect(session.selectedWorld).toBe("bridge");
    expect(getCurrentScene(session, demoContent.scenario).id).toBe(
      "bridge-act-1"
    );
  });

  it("clamps every state dimension to 0–100", () => {
    const state: StateVector = {
      cashSafety: 95,
      careerOptionality: 5,
      growthSlope: 50,
      relationshipCapital: 50,
      wellbeingLoad: 99,
      valueAlignment: 1
    };
    const delta: StateDelta = {
      cashSafety: 20,
      careerOptionality: -20,
      growthSlope: 0,
      relationshipCapital: 0,
      wellbeingLoad: 20,
      valueAlignment: -20
    };

    expect(applyStateDelta(state, delta)).toEqual({
      cashSafety: 100,
      careerOptionality: 0,
      growthSlope: 50,
      relationshipCapital: 50,
      wellbeingLoad: 100,
      valueAlignment: 0
    });
  });

  it("applies one action, writes the ledger, and advances one act", () => {
    const selected = selectWorld(
      freshSession(),
      demoContent.scenario,
      "stay",
      NOW
    );
    const result = applyAction(
      selected,
      demoContent.scenario,
      "stay-1-written-promotion",
      NOW
    );

    expect(result.scene.id).toBe("stay-act-1");
    expect(result.session.act).toBe(2);
    expect(result.session.actionHistory).toEqual(["stay-1-written-promotion"]);
    expect(result.session.ledger.benefits).toContain("留下后有明确目标");
    expect(result.session.ledger.irreversibleEvents).toContain(
      "公司已经知道你考虑过离职"
    );
  });

  it("rejects an action from another world or another act", () => {
    const selected = selectWorld(
      freshSession(),
      demoContent.scenario,
      "stay",
      NOW
    );

    expect(() =>
      applyAction(selected, demoContent.scenario, "leap-1-signed-terms", NOW)
    ).toThrowError(expect.objectContaining({ code: "ACTION_OUT_OF_TURN" }));
    expect(() =>
      applyAction(
        selected,
        demoContent.scenario,
        "stay-2-market-interviews",
        NOW
      )
    ).toThrowError(expect.objectContaining({ code: "ACTION_OUT_OF_TURN" }));
  });

  it("requires exactly one assumption blast before act three", () => {
    let session = selectWorld(
      freshSession(),
      demoContent.scenario,
      "stay",
      NOW
    );
    session = applyAction(
      session,
      demoContent.scenario,
      "stay-1-written-promotion",
      NOW
    ).session;

    expect(() =>
      applyAssumptionBlast(
        session,
        demoContent.outcomes,
        "equivalent-job-not-available",
        NOW
      )
    ).toThrowError(expect.objectContaining({ code: "ASSUMPTION_WRONG_PHASE" }));

    session = applyAction(
      session,
      demoContent.scenario,
      "stay-2-market-interviews",
      NOW
    ).session;
    expect(() =>
      applyAction(session, demoContent.scenario, "stay-3-side-incubation", NOW)
    ).toThrowError(expect.objectContaining({ code: "ASSUMPTION_REQUIRED" }));

    const blasted = applyAssumptionBlast(
      session,
      demoContent.outcomes,
      "equivalent-job-not-available",
      NOW
    );
    expect(blasted.session.blastedAssumptionId).toBe(
      "equivalent-job-not-available"
    );
    expect(blasted.session.ledger.facts).toContain(
      "面试后发现，有些能力离开现在的平台就不值钱了"
    );
    expect(() =>
      applyAssumptionBlast(
        blasted.session,
        demoContent.outcomes,
        "equity-promise-breaks",
        NOW
      )
    ).toThrowError(
      expect.objectContaining({
        code: "ASSUMPTION_ALREADY_APPLIED"
      })
    );
  });

  it.each([
    {
      evidenceOptionId: "equity-written",
      result: "supported" as const,
      stateEffect: "keep",
      fact: "股权和职位已经写进合同"
    },
    {
      evidenceOptionId: "equity-verbal-only",
      result: "inconclusive" as const,
      stateEffect: "uncertain",
      fact: "股权条件仍缺少完整书面材料"
    },
    {
      evidenceOptionId: "equity-missing",
      result: "contradicted" as const,
      stateEffect: "reversal",
      fact: "口头股权没有出现在合同里"
    }
  ])(
    "applies the $result assumption check without forcing a reversal",
    ({ evidenceOptionId, result, stateEffect, fact }) => {
      let session = selectWorld(
        freshSession(),
        demoContent.scenario,
        "bridge",
        NOW
      );
      session = applyAction(
        session,
        demoContent.scenario,
        "bridge-1-evidence-sprint",
        NOW
      ).session;
      session = applyAction(
        session,
        demoContent.scenario,
        "bridge-2-conditional-join",
        NOW
      ).session;
      const stateBefore = session.state;

      const checked = applyAssumptionCheck(
        session,
        demoContent.outcomes,
        "equity-promise-breaks",
        evidenceOptionId,
        NOW
      );

      expect(checked.result).toBe(result);
      expect(checked.outcome.stateEffect).toBe(stateEffect);
      expect(checked.session.assumptionResult).toBe(result);
      expect(checked.session.assumptionEvidenceId).toBe(evidenceOptionId);
      expect(checked.session.blastedAssumptionId).toBe("equity-promise-breaks");
      expect(checked.session.ledger.facts).toContain(fact);
      if (result !== "contradicted") {
        expect(checked.stateAfter).toEqual(stateBefore);
      } else {
        expect(checked.stateAfter).not.toEqual(stateBefore);
      }
    }
  );

  it("rejects an evidence option from another assumption", () => {
    let session = selectWorld(
      freshSession(),
      demoContent.scenario,
      "bridge",
      NOW
    );
    session = applyAction(
      session,
      demoContent.scenario,
      "bridge-1-evidence-sprint",
      NOW
    ).session;
    session = applyAction(
      session,
      demoContent.scenario,
      "bridge-2-conditional-join",
      NOW
    ).session;

    expect(() =>
      applyAssumptionCheck(
        session,
        demoContent.outcomes,
        "equity-promise-breaks",
        "return-offer-drops",
        NOW
      )
    ).toThrowError(
      expect.objectContaining({ code: "ASSUMPTION_EVIDENCE_NOT_FOUND" })
    );
  });

  it("completes a three-act route and produces a transparent three-world comparison", () => {
    const session = playStayRoute();
    const result = calculateOutcome(
      session,
      demoContent.scenario,
      demoContent.outcomes
    );

    expect(session.status).toBe("completed");
    expect(session.actionHistory).toHaveLength(3);
    expect(result.selectedWorld).toBe("stay");
    expect(result.worlds).toHaveLength(3);
    expect(result.worlds.find((world) => world.worldId === "stay")?.mode).toBe(
      "explored"
    );
    expect(
      result.worlds.filter((world) => world.mode === "scenario-profile")
    ).toHaveLength(2);
    expect(result.blindSpotIds).toContain("return-option-illusion");
    expect(result.experimentId).toBe("test-market-return");
    expect(result.futureLetterId).toMatch(/^stay-letter-/);
    expect(validateLedger(session, demoContent.scenario)).toEqual([]);
  });

  it("selects a reality test from route, action, and assumption evidence", () => {
    const staySelection = selectExperiment(
      playStayRoute(),
      demoContent.scenario,
      demoContent.outcomes
    );
    expect(staySelection.experiment.id).toBe("test-market-return");
    expect(staySelection.reasons.join(" ")).toContain("匹配当前路线");
    expect(staySelection.reasons.join(" ")).toContain("命中前面行动");

    let bridgeSession = selectWorld(
      freshSession(),
      demoContent.scenario,
      "bridge",
      NOW
    );
    bridgeSession = applyAction(
      bridgeSession,
      demoContent.scenario,
      "bridge-1-evidence-sprint",
      NOW
    ).session;
    bridgeSession = applyAction(
      bridgeSession,
      demoContent.scenario,
      "bridge-2-conditional-join",
      NOW
    ).session;
    bridgeSession = applyAssumptionBlast(
      bridgeSession,
      demoContent.outcomes,
      "equity-promise-breaks",
      NOW
    ).session;
    bridgeSession = applyAction(
      bridgeSession,
      demoContent.scenario,
      "bridge-3-validated-join",
      NOW
    ).session;
    const bridgeSelection = selectExperiment(
      bridgeSession,
      demoContent.scenario,
      demoContent.outcomes
    );
    expect(bridgeSelection.experiment.id).toBe("test-family-stress");
    expect(bridgeSelection.reasons.join(" ")).toContain("证据冲突");
  });

  it.each<WorldId>(["stay", "leap", "bridge"])(
    "can complete the %s world deterministically",
    (worldId) => {
      const world = demoContent.scenario.worlds.find(
        (candidate) => candidate.id === worldId
      )!;
      let session = selectWorld(
        freshSession(),
        demoContent.scenario,
        worldId,
        NOW
      );
      session = applyAction(
        session,
        demoContent.scenario,
        world.acts[0].actions[0].id,
        NOW
      ).session;
      session = applyAction(
        session,
        demoContent.scenario,
        world.acts[1].actions[0].id,
        NOW
      ).session;
      session = applyAssumptionBlast(
        session,
        demoContent.outcomes,
        "equity-promise-breaks",
        NOW
      ).session;
      session = applyAction(
        session,
        demoContent.scenario,
        world.acts[2].actions[0].id,
        NOW
      ).session;

      expect(session.status).toBe("completed");
      expect(session.actionHistory).toHaveLength(3);
      expect(validateLedger(session, demoContent.scenario)).toEqual([]);
    }
  );

  it("detects a tampered ledger history", () => {
    const session = structuredClone(playStayRoute()) as GameSession;
    session.actionHistory.push("missing-action", session.actionHistory[0]);
    session.ledger.facts.push(session.ledger.facts[0]);

    expect(
      validateLedger(session, demoContent.scenario).map((issue) => issue.code)
    ).toEqual(
      expect.arrayContaining([
        "UNKNOWN_ACTION",
        "DUPLICATE_ACTION",
        "CROSS_WORLD_ACTION",
        "INCOMPLETE_HISTORY",
        "DUPLICATE_LEDGER_ENTRY"
      ])
    );
  });

  it("records a daily experiment choice, note, and evidence progress", () => {
    const completed = playStayRoute();
    const started = startExperiment(
      completed,
      demoContent.outcomes,
      "test-market-return",
      NOW
    );
    const advanced = advanceExperiment(
      started,
      demoContent.outcomes,
      "test-market-return",
      NOW,
      { choice: "约一位招聘方聊真实岗位", note: "对方愿意聊，但薪资还没确认" }
    );

    expect(advanced.session.experimentRun).toMatchObject({
      day: 1,
      status: "active",
      evidenceScore: 18,
      events: [
        {
          day: 1,
          choice: "约一位招聘方聊真实岗位",
          note: "对方愿意聊，但薪资还没确认"
        }
      ]
    });
  });

  it("forks a counterfactual world without mutating the completed route", () => {
    const completed = playStayRoute();
    const fork = forkSession(completed, demoContent.scenario, "leap", {
      id: "test-counterfactual",
      seed: 99,
      now: NOW
    });

    expect(fork.id).toBe("test-counterfactual");
    expect(fork.status).toBe("playing");
    expect(fork.selectedWorld).toBe("leap");
    expect(fork.actionHistory).toEqual([]);
    expect(completed.selectedWorld).toBe("stay");
    expect(completed.status).toBe("completed");
  });
});
