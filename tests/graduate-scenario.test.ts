import { describe, expect, it } from "vitest";

import {
  GRADUATE_DEMO_CALIBRATION,
  advanceExperiment,
  applyAction,
  applyAssumptionCheck,
  calculateOutcome,
  createSession,
  graduateContent,
  selectExperiment,
  selectWorld,
  startExperiment
} from "../src/features/game";

const NOW = "2026-09-09T04:00:00.000Z";

describe("TASK-037 graduate-school playable scenario", () => {
  it("has an independent reviewed pack instead of reusing startup content", () => {
    const { outcomes, scenario, sourceCards } = graduateContent;

    expect(scenario.scenarioId).toBe("graduate-school");
    expect(scenario.title).toContain("读研");
    expect(sourceCards).toHaveLength(6);
    expect(sourceCards.every((card) => card.id.startsWith("zh-grad-"))).toBe(
      true
    );
    expect(scenario.worlds.map((world) => world.id)).toEqual([
      "deepen-work",
      "full-time-prep",
      "dual-track"
    ]);
    expect(scenario.worlds.flatMap((world) => world.acts)).toHaveLength(9);
    expect(
      scenario.worlds.flatMap((world) =>
        world.acts.flatMap((act) => act.actions)
      )
    ).toHaveLength(27);
    expect(outcomes.assumptionBlasts.map((item) => item.id)).toContain(
      "degree-opens-door"
    );
    expect(outcomes.sevenDayExperiments).toHaveLength(27);
    expect(
      outcomes.sevenDayExperiments.every(
        (item) => item.simulationDays?.length === 7
      )
    ).toBe(true);
  });

  it("completes the in-job validation route and selects its own reality test", () => {
    const { outcomes, scenario } = graduateContent;
    let session = selectWorld(
      createSession(GRADUATE_DEMO_CALIBRATION, scenario, {
        id: "graduate-route-test",
        now: NOW
      }),
      scenario,
      "dual-track",
      NOW
    );

    session = applyAction(
      session,
      scenario,
      "bridge-1-admissions-audit",
      NOW
    ).session;
    session = applyAction(
      session,
      scenario,
      "bridge-2-one-page-plan",
      NOW
    ).session;
    session = applyAssumptionCheck(
      session,
      outcomes,
      "degree-opens-door",
      "degree-opens-door-inconclusive",
      NOW
    ).session;
    session = applyAction(
      session,
      scenario,
      "bridge-3-submit-while-working",
      NOW
    ).session;

    const selection = selectExperiment(session, scenario, outcomes);
    expect(selection.experiment.title).toContain("在职验证再决定");
    expect(selection.experiment.triggerActionIds).toContain(
      "bridge-3-submit-while-working"
    );

    const outcome = calculateOutcome(session, scenario, outcomes);
    expect(outcome.selectedWorld).toBe("dual-track");
    expect(outcome.experimentId).toBe(selection.experiment.id);

    session = startExperiment(session, outcomes, outcome.experimentId, NOW);
    for (let day = 1; day <= 7; day += 1) {
      session = advanceExperiment(
        session,
        outcomes,
        outcome.experimentId,
        NOW,
        {
          choice: `第 ${day} 天的真实记录`,
          note: "留下可核对的材料"
        }
      ).session;
    }

    expect(session.experimentRun).toMatchObject({
      status: "completed",
      day: 7,
      evidenceScore: 100
    });
  });
});
