import rawSourceCardPack from "../../../content/evidence/source-cards.json";
import rawOutcomeTemplates from "../../../content/scenarios/startup-outcome-templates.v1.json";
import rawScenario from "../../../content/scenarios/startup-scenario.v1.json";
import { graduateRawContent } from "./graduate-content";

import {
  OutcomeTemplatesSchema,
  ScenarioSchema,
  SourceCardPackSchema,
  type OutcomeTemplates,
  type Scenario,
  type SourceCard
} from "./schema";

export interface DemoContent {
  sourceCards: SourceCard[];
  evidenceRetrievedAt: string;
  scenario: Scenario;
  outcomes: OutcomeTemplates;
  pack: ScenarioPack;
}

/**
 * One portable content unit for a future user-provided dilemma.
 * The current demo still keeps the source JSON files separate for review, but
 * the UI and any future generator can consume this normalized pack instead.
 */
export interface ScenarioPack {
  problem: {
    id: string;
    title: string;
    subtitle: string;
    disclaimer: string;
  };
  constraints: string[];
  dimensions: Scenario["stateModel"]["dimensions"];
  worlds: Scenario["worlds"];
  acts: Scenario["worlds"][number]["acts"];
  actions: Scenario["worlds"][number]["acts"][number]["actions"];
  assumptions: OutcomeTemplates["assumptionBlasts"];
  experiments: OutcomeTemplates["sevenDayExperiments"];
  sources: SourceCard[];
}

export interface RawDemoContent {
  sourceCards: unknown;
  scenario: unknown;
  outcomes: unknown;
}

export class DemoContentReferenceError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(
      `Demo content contains invalid references:\n- ${issues.join("\n- ")}`
    );
    this.name = "DemoContentReferenceError";
    this.issues = issues;
  }
}

function collectSourceReferences(
  scenario: Scenario,
  outcomes: OutcomeTemplates
) {
  const references: Array<{ owner: string; sourceId: string }> = [];

  for (const world of scenario.worlds) {
    for (const scene of world.acts) {
      for (const sourceId of scene.sourceIds) {
        references.push({ owner: `scene:${scene.id}`, sourceId });
      }
      for (const action of scene.actions) {
        for (const sourceId of action.sourceIds) {
          references.push({ owner: `action:${action.id}`, sourceId });
        }
      }
      for (const [worldId, echo] of Object.entries(scene.echoes)) {
        for (const sourceId of echo.sourceIds) {
          references.push({ owner: `echo:${scene.id}:${worldId}`, sourceId });
        }
      }
    }
  }

  for (const blast of outcomes.assumptionBlasts) {
    for (const sourceId of blast.sourceIds) {
      references.push({ owner: `assumption:${blast.id}`, sourceId });
    }
  }
  for (const blindSpot of outcomes.blindSpots) {
    for (const sourceId of blindSpot.sourceIds) {
      references.push({ owner: `blind-spot:${blindSpot.id}`, sourceId });
    }
  }
  for (const letter of outcomes.futureLetters) {
    for (const sourceId of letter.sourceIds) {
      references.push({ owner: `future-letter:${letter.id}`, sourceId });
    }
  }
  for (const experiment of outcomes.sevenDayExperiments) {
    for (const sourceId of experiment.sourceIds) {
      references.push({ owner: `experiment:${experiment.id}`, sourceId });
    }
  }

  return references;
}

export function parseDemoContent(input: RawDemoContent): DemoContent {
  const sourceCardPack = SourceCardPackSchema.parse(input.sourceCards);
  const scenario = ScenarioSchema.parse(input.scenario);
  const outcomes = OutcomeTemplatesSchema.parse(input.outcomes);
  const issues: string[] = [];

  if (scenario.scenarioId !== outcomes.scenarioId) {
    issues.push(
      `scenario ID mismatch: ${scenario.scenarioId} != ${outcomes.scenarioId}`
    );
  }

  const sourceIds = new Set(sourceCardPack.cards.map((card) => card.id));
  const worldIds = new Set(scenario.worlds.map((world) => world.id));
  for (const reference of collectSourceReferences(scenario, outcomes)) {
    if (!sourceIds.has(reference.sourceId)) {
      issues.push(
        `${reference.owner} references missing source ${reference.sourceId}`
      );
    }
  }

  const actionIds = new Set(
    scenario.worlds.flatMap((world) =>
      world.acts.flatMap((scene) => scene.actions.map((action) => action.id))
    )
  );
  for (const blindSpot of outcomes.blindSpots) {
    for (const actionId of blindSpot.triggerActionIds) {
      if (!actionIds.has(actionId)) {
        issues.push(
          `blind-spot:${blindSpot.id} references missing action ${actionId}`
        );
      }
    }
  }
  for (const experiment of outcomes.sevenDayExperiments) {
    for (const actionId of experiment.triggerActionIds) {
      if (!actionIds.has(actionId)) {
        issues.push(
          `experiment:${experiment.id} references missing action ${actionId}`
        );
      }
    }
  }

  for (const assumption of outcomes.assumptionBlasts) {
    for (const [field, values] of [
      ["deltaByWorld", assumption.deltaByWorld],
      ["addedFactsByWorld", assumption.addedFactsByWorld],
      ["irreversibleEventsByWorld", assumption.irreversibleEventsByWorld],
      ["fallbackNarrativeByWorld", assumption.fallbackNarrativeByWorld]
    ] as const) {
      for (const worldId of worldIds) {
        if (!(worldId in values)) {
          issues.push(
            `assumption:${assumption.id}.${field} is missing world ${worldId}`
          );
        }
      }
      for (const worldId of Object.keys(values)) {
        if (!worldIds.has(worldId)) {
          issues.push(
            `assumption:${assumption.id}.${field} references unknown world ${worldId}`
          );
        }
      }
    }
  }

  if (issues.length > 0) {
    throw new DemoContentReferenceError(issues);
  }

  const content = {
    sourceCards: sourceCardPack.cards,
    evidenceRetrievedAt: sourceCardPack.retrievedAt,
    scenario,
    outcomes
  };

  return {
    ...content,
    pack: {
      problem: {
        id: scenario.scenarioId,
        title: scenario.title,
        subtitle: scenario.subtitle,
        disclaimer: scenario.disclaimer
      },
      constraints: scenario.calibrationRules,
      dimensions: scenario.stateModel.dimensions,
      worlds: scenario.worlds,
      acts: scenario.worlds.flatMap((world) => world.acts),
      actions: scenario.worlds.flatMap((world) =>
        world.acts.flatMap((scene) => scene.actions)
      ),
      assumptions: outcomes.assumptionBlasts,
      experiments: outcomes.sevenDayExperiments,
      sources: sourceCardPack.cards
    }
  };
}

export const demoContent = parseDemoContent({
  sourceCards: rawSourceCardPack,
  scenario: rawScenario,
  outcomes: rawOutcomeTemplates
});

/** All hand-reviewed scenarios that can be launched in the product today. */
export const graduateContent = parseDemoContent(graduateRawContent);

export const playableContents = [demoContent, graduateContent] as const;

export function getPlayableContent(scenarioId?: string) {
  return (
    playableContents.find(
      (content) => content.scenario.scenarioId === scenarioId
    ) ?? demoContent
  );
}

export const scenarioCatalog = playableContents.map((content) => ({
  id: content.scenario.scenarioId,
  title: content.scenario.title,
  subtitle: content.scenario.subtitle,
  worlds: content.scenario.worlds.map((world) => ({
    id: world.id,
    name: world.name,
    tagline: world.tagline
  })),
  sourceCount: content.sourceCards.length
}));

export const contentStats = {
  sources: demoContent.sourceCards.length,
  worlds: demoContent.scenario.worlds.length,
  scenes: demoContent.scenario.worlds.reduce(
    (sum, world) => sum + world.acts.length,
    0
  ),
  actions: demoContent.scenario.worlds.reduce(
    (sum, world) =>
      sum +
      world.acts.reduce((actSum, scene) => actSum + scene.actions.length, 0),
    0
  )
} as const;
