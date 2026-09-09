import type { GameSession, OutcomeTemplates, Scenario } from "./schema";

/** A portable, user-owned snapshot. It intentionally has no account or storage key. */
export function buildExperimentExport(
  session: GameSession,
  scenario: Scenario,
  outcomes: OutcomeTemplates
) {
  const run = session.experimentRun;
  const assumption = outcomes.assumptionBlasts.find(
    (item) => item.id === session.blastedAssumptionId
  );
  const experiment = outcomes.sevenDayExperiments.find(
    (item) => item.id === run?.experimentId
  );

  return {
    exportedAt: new Date().toISOString(),
    format: "life-fork-machine.experiment.v1",
    scenario: { id: scenario.scenarioId, title: scenario.title },
    route: {
      worldId: session.selectedWorld,
      actionIds: session.actionHistory,
      assumption: assumption
        ? {
            label: assumption.label,
            beforeExperiment: session.assumptionResult ?? "inconclusive",
            afterExperiment: run?.feedback
          }
        : undefined
    },
    experiment: experiment
      ? {
          id: experiment.id,
          title: experiment.title,
          question: experiment.question,
          mode: run?.mode,
          status: run?.status,
          startedOn: run?.startedOn,
          nextAvailableOn: run?.nextAvailableOn,
          stoppedAt: run?.stoppedAt,
          stopReason: run?.stopReason,
          evidenceScore: run?.evidenceScore ?? 0,
          entries: run?.events ?? [],
          adjustments: run?.adjustments ?? []
        }
      : undefined
  };
}
