import { describe, expect, it } from "vitest";

import rawSourceCardPack from "../content/evidence/source-cards.json";
import rawOutcomeTemplates from "../content/scenarios/startup-outcome-templates.v1.json";
import rawScenario from "../content/scenarios/startup-scenario.v1.json";
import {
  DemoContentReferenceError,
  ScenarioSchema,
  contentStats,
  demoContent,
  parseDemoContent
} from "../src/features/game";

const validInput = () => ({
  sourceCards: structuredClone(rawSourceCardPack),
  scenario: structuredClone(rawScenario),
  outcomes: structuredClone(rawOutcomeTemplates)
});

describe("D01 demo content contract", () => {
  it("loads the complete playable content pack", () => {
    expect(contentStats).toEqual({
      sources: 8,
      worlds: 3,
      scenes: 9,
      actions: 27
    });
    expect(demoContent.scenario.worlds.map((world) => world.id)).toEqual([
      "stay",
      "leap",
      "bridge"
    ]);
    expect(demoContent.pack.problem.id).toBe("startup-leader-invitation");
    expect(demoContent.pack.constraints).toEqual(
      demoContent.scenario.calibrationRules
    );
    expect(demoContent.pack.dimensions).toBe(
      demoContent.scenario.stateModel.dimensions
    );
    expect(demoContent.pack.acts).toHaveLength(9);
    expect(demoContent.pack.actions).toHaveLength(27);
    expect(demoContent.pack.assumptions).toBe(
      demoContent.outcomes.assumptionBlasts
    );
    expect(demoContent.pack.experiments).toBe(
      demoContent.outcomes.sevenDayExperiments
    );
    expect(demoContent.pack.sources).toBe(demoContent.sourceCards);
  });

  it("accepts the current S02 and S03 JSON files", () => {
    expect(() => parseDemoContent(validInput())).not.toThrow();
    for (const assumption of demoContent.outcomes.assumptionBlasts) {
      expect(assumption.evidenceOptions).toHaveLength(3);
      expect(Object.keys(assumption.outcomes)).toEqual([
        "supported",
        "contradicted",
        "inconclusive"
      ]);
    }
  });

  it("accepts a renamed scenario without changing the content contract", () => {
    const input = validInput();
    const worldIdMap = {
      stay: "steady",
      leap: "venture",
      bridge: "hybrid"
    } as const;
    input.scenario.scenarioId = "career-choice";
    input.outcomes.scenarioId = "career-choice";
    input.sourceCards.scenarioId = "career-choice";
    input.scenario.worlds.forEach((world) => {
      const previousId = world.id as keyof typeof worldIdMap;
      world.id = worldIdMap[previousId];
      world.acts.forEach((scene) => {
        scene.echoes = Object.fromEntries(
          Object.entries(scene.echoes).map(([id, echo]) => [
            worldIdMap[id as keyof typeof worldIdMap],
            echo
          ])
        ) as typeof scene.echoes;
      });
    });
    input.outcomes.futureLetters.forEach((letter) => {
      letter.worldId = worldIdMap[letter.worldId as keyof typeof worldIdMap];
    });
    input.outcomes.assumptionBlasts.forEach((assumption) => {
      for (const field of [
        "deltaByWorld",
        "addedFactsByWorld",
        "irreversibleEventsByWorld",
        "fallbackNarrativeByWorld"
      ] as const) {
        const worldMap = assumption[field] as Record<string, unknown>;
        const remappedWorldMap = Object.fromEntries(
          Object.entries(worldMap).map(([id, value]) => [
            worldIdMap[id as keyof typeof worldIdMap],
            value
          ])
        );
        for (const key of Object.keys(worldMap)) delete worldMap[key];
        Object.assign(worldMap, remappedWorldMap);
      }
    });

    const parsed = parseDemoContent(input);
    expect(parsed.pack.problem.id).toBe("career-choice");
    expect(parsed.pack.worlds.map((world) => world.id)).toEqual([
      "steady",
      "venture",
      "hybrid"
    ]);
  });

  it("rejects a missing required field", () => {
    const scenario = structuredClone(rawScenario);
    Reflect.deleteProperty(scenario.worlds[0].acts[0].actions[0], "label");

    expect(ScenarioSchema.safeParse(scenario).success).toBe(false);
  });

  it("rejects state values outside the 0–100 range", () => {
    const scenario = structuredClone(rawScenario);
    scenario.worlds[0].initialState.cashSafety = 101;

    expect(ScenarioSchema.safeParse(scenario).success).toBe(false);
  });

  it("rejects a missing Zhihu source reference", () => {
    const input = validInput();
    input.scenario.worlds[0].acts[0].actions[0].sourceIds[0] = "zh-startup-99";

    expect(() => parseDemoContent(input)).toThrow(DemoContentReferenceError);
    expect(() => parseDemoContent(input)).toThrow(
      /missing source zh-startup-99/
    );
  });

  it("rejects a missing action trigger reference", () => {
    const input = validInput();
    input.outcomes.blindSpots[0].triggerActionIds[0] = "missing-action";

    expect(() => parseDemoContent(input)).toThrow(DemoContentReferenceError);
    expect(() => parseDemoContent(input)).toThrow(
      /missing action missing-action/
    );
  });
});
