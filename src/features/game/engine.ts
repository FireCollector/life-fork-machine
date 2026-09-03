import {
  STATE_KEYS,
  CalibrationAnswersSchema,
  GameSessionSchema,
  type Action,
  type AssumptionCheck,
  type AssumptionResultKind,
  type CalibrationAnswers,
  type CommitmentLedger,
  type GameSession,
  type OutcomeTemplates,
  type Scenario,
  type Scene,
  type StateDelta,
  type StateVector,
  type World,
  type WorldId
} from "./schema";

export type GameRuleErrorCode =
  | "WORLD_ALREADY_SELECTED"
  | "WORLD_NOT_SELECTED"
  | "WORLD_NOT_FOUND"
  | "SESSION_NOT_PLAYABLE"
  | "SCENE_NOT_FOUND"
  | "ACTION_NOT_FOUND"
  | "ACTION_OUT_OF_TURN"
  | "ACTION_ALREADY_USED"
  | "ASSUMPTION_NOT_FOUND"
  | "ASSUMPTION_EVIDENCE_NOT_FOUND"
  | "ASSUMPTION_WRONG_PHASE"
  | "ASSUMPTION_ALREADY_APPLIED"
  | "ASSUMPTION_REQUIRED"
  | "OUTCOME_TEMPLATE_NOT_FOUND"
  | "EXPERIMENT_NOT_FOUND"
  | "EXPERIMENT_ALREADY_STARTED"
  | "EXPERIMENT_NOT_STARTED"
  | "EXPERIMENT_COMPLETED"
  | "EXPERIMENT_NOT_COMPLETED"
  | "SESSION_NOT_COMPLETED";

export class GameRuleError extends Error {
  constructor(
    readonly code: GameRuleErrorCode,
    message: string
  ) {
    super(message);
    this.name = "GameRuleError";
  }
}

export interface CreateSessionOptions {
  id?: string;
  seed?: number;
  now?: string;
}

export interface TurnResult {
  session: GameSession;
  scene: Scene;
  action: Action;
  stateBefore: StateVector;
  stateAfter: StateVector;
}

export interface AssumptionCheckResult {
  session: GameSession;
  assumptionId: string;
  evidenceOptionId: string;
  result: AssumptionResultKind;
  outcome: AssumptionCheck["outcomes"][AssumptionResultKind];
  stateBefore: StateVector;
  stateAfter: StateVector;
  narrative: string;
}

export interface ExperimentAdvanceOptions {
  choice?: string;
  note?: string;
}

/** @deprecated D10 keeps this name so the current UI can migrate in D11. */
export type AssumptionBlastResult = AssumptionCheckResult;

export interface WorldOutcome {
  worldId: WorldId;
  state: StateVector;
  mode: "explored" | "scenario-profile";
  dominantStrength: keyof StateVector;
  pressurePoint: keyof StateVector;
}

export interface OutcomeComparison {
  selectedWorld: WorldId;
  worlds: WorldOutcome[];
  blindSpotIds: string[];
  futureLetterId: string;
  experimentId: string;
  experimentSelection: ExperimentSelection;
}

export interface ExperimentSelection {
  experiment: OutcomeTemplates["sevenDayExperiments"][number];
  score: number;
  reasons: string[];
}

export interface ValidationIssue {
  code: string;
  message: string;
}

const ZERO_DELTA: StateDelta = {
  cashSafety: 0,
  careerOptionality: 0,
  growthSlope: 0,
  relationshipCapital: 0,
  wellbeingLoad: 0,
  valueAlignment: 0
};

const EMPTY_LEDGER: CommitmentLedger = {
  benefits: [],
  costs: [],
  facts: [],
  commitments: [],
  irreversibleEvents: []
};

const RUNWAY_DELTAS: Record<
  CalibrationAnswers["runway"],
  Partial<StateDelta>
> = {
  "under-3": { cashSafety: -18, wellbeingLoad: 8 },
  "3-6": { cashSafety: -10, wellbeingLoad: 5 },
  "6-12": { cashSafety: -4, wellbeingLoad: 2 },
  "12-24": { cashSafety: 5, wellbeingLoad: -2 },
  "over-24": { cashSafety: 10, wellbeingLoad: -4 }
};

const SHARED_RISK_DELTAS: Record<
  CalibrationAnswers["sharedRisk"],
  Partial<StateDelta>
> = {
  self: {},
  partner: { relationshipCapital: -2, wellbeingLoad: 2 },
  dependents: { cashSafety: -6, relationshipCapital: -4, wellbeingLoad: 5 },
  multiple: { cashSafety: -8, relationshipCapital: -6, wellbeingLoad: 7 }
};

const FEAR_DELTAS: Record<
  CalibrationAnswers["primaryFear"],
  Partial<StateDelta>
> = {
  "miss-opportunity": { growthSlope: 4, valueAlignment: 3 },
  "financial-loss": { cashSafety: -3, wellbeingLoad: 3 },
  "relationship-damage": { relationshipCapital: -4, wellbeingLoad: 3 },
  "growth-stagnation": { growthSlope: -3, valueAlignment: -3 }
};

const GOAL_DELTAS: Record<
  CalibrationAnswers["primaryGoal"],
  Partial<StateDelta>
> = {
  stability: { cashSafety: 4, wellbeingLoad: -2 },
  growth: { growthSlope: 5, wellbeingLoad: 2 },
  autonomy: { careerOptionality: 4, valueAlignment: 3 },
  meaning: { valueAlignment: 6, growthSlope: 2 }
};

const UNCERTAINTY_DELTAS: Record<
  CalibrationAnswers["uncertaintyStyle"],
  Partial<StateDelta>
> = {
  "act-first": { growthSlope: 3, careerOptionality: -2, wellbeingLoad: 2 },
  "validate-first": { careerOptionality: 4, wellbeingLoad: 1 },
  "prepare-first": { cashSafety: 3, growthSlope: -2, wellbeingLoad: -1 }
};

function nowOrDefault(now?: string) {
  return now ?? new Date().toISOString();
}

function sessionIdOrDefault() {
  return globalThis.crypto.randomUUID();
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unique(items: string[]) {
  return [...new Set(items)];
}

function requireWorld(scenario: Scenario, worldId: WorldId) {
  const world = scenario.worlds.find((candidate) => candidate.id === worldId);
  if (!world) {
    throw new GameRuleError(
      "WORLD_NOT_FOUND",
      `World ${worldId} does not exist in this scenario.`
    );
  }
  return world;
}

function mergePartialDeltas(parts: Partial<StateDelta>[]) {
  const result = { ...ZERO_DELTA };
  for (const part of parts) {
    for (const key of STATE_KEYS) {
      result[key] += part[key] ?? 0;
    }
  }
  return result;
}

export function getCalibrationDelta(
  calibration: CalibrationAnswers
): StateDelta {
  return mergePartialDeltas([
    RUNWAY_DELTAS[calibration.runway],
    SHARED_RISK_DELTAS[calibration.sharedRisk],
    FEAR_DELTAS[calibration.primaryFear],
    GOAL_DELTAS[calibration.primaryGoal],
    UNCERTAINTY_DELTAS[calibration.uncertaintyStyle]
  ]);
}

export function applyStateDelta(
  state: StateVector,
  delta: StateDelta
): StateVector {
  return Object.fromEntries(
    STATE_KEYS.map((key) => [
      key,
      Math.min(100, Math.max(0, state[key] + delta[key]))
    ])
  ) as unknown as StateVector;
}

export function createSession(
  calibration: CalibrationAnswers,
  scenario: Scenario,
  options: CreateSessionOptions = {}
): GameSession {
  const id = options.id ?? sessionIdOrDefault();
  const timestamp = nowOrDefault(options.now);

  return GameSessionSchema.parse({
    schemaVersion: 1,
    id,
    scenarioId: scenario.scenarioId,
    status: "forging",
    calibration,
    act: 1,
    state: scenario.commonBaseline,
    ledger: EMPTY_LEDGER,
    actionHistory: [],
    seed: options.seed ?? hashSeed(id),
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

export function selectWorld(
  session: GameSession,
  scenario: Scenario,
  worldId: WorldId,
  now?: string
): GameSession {
  if (session.selectedWorld) {
    throw new GameRuleError(
      "WORLD_ALREADY_SELECTED",
      "A world has already been selected for this session."
    );
  }
  const world = requireWorld(scenario, worldId);

  return GameSessionSchema.parse({
    ...session,
    selectedWorld: worldId,
    status: "playing",
    act: 1,
    state: applyStateDelta(
      world.initialState,
      getCalibrationDelta(CalibrationAnswersSchema.parse(session.calibration))
    ),
    updatedAt: nowOrDefault(now)
  });
}

/**
 * Start a clean local session from a completed route's calibration so users
 * can inspect a counterfactual world without mutating the original result.
 */
export function forkSession(
  session: GameSession,
  scenario: Scenario,
  worldId: WorldId,
  options: CreateSessionOptions = {}
): GameSession {
  const calibration = CalibrationAnswersSchema.parse(session.calibration);
  const fork = createSession(calibration, scenario, {
    ...options,
    id: options.id ?? `${session.id}-fork-${worldId}-${Date.now()}`,
    seed: options.seed ?? session.seed + scenario.worlds.findIndex((world) => world.id === worldId) + 1
  });
  return selectWorld(fork, scenario, worldId, options.now);
}

export function getCurrentScene(
  session: GameSession,
  scenario: Scenario
): Scene {
  if (!session.selectedWorld) {
    throw new GameRuleError(
      "WORLD_NOT_SELECTED",
      "Select a world before reading a scene."
    );
  }
  const scene = requireWorld(scenario, session.selectedWorld).acts.find(
    (candidate) => candidate.act === session.act
  );
  if (!scene) {
    throw new GameRuleError(
      "SCENE_NOT_FOUND",
      `Act ${session.act} does not exist in ${session.selectedWorld}.`
    );
  }
  return scene;
}

export function applyAction(
  session: GameSession,
  scenario: Scenario,
  actionId: string,
  now?: string
): TurnResult {
  if (session.status !== "playing") {
    throw new GameRuleError(
      "SESSION_NOT_PLAYABLE",
      "Only a playing session can accept an action."
    );
  }
  if (session.actionHistory.includes(actionId)) {
    throw new GameRuleError(
      "ACTION_ALREADY_USED",
      `Action ${actionId} has already been applied.`
    );
  }
  if (
    session.act === 3 &&
    !session.blastedAssumptionId &&
    !session.assumptionResult
  ) {
    throw new GameRuleError(
      "ASSUMPTION_REQUIRED",
      "Check one assumption before choosing the final action."
    );
  }

  const scene = getCurrentScene(session, scenario);
  const action = scenario.worlds
    .flatMap((world) => world.acts)
    .flatMap((candidate) => candidate.actions)
    .find((candidate) => candidate.id === actionId);
  if (!action) {
    throw new GameRuleError(
      "ACTION_NOT_FOUND",
      `Action ${actionId} does not exist.`
    );
  }
  if (!scene.actions.some((candidate) => candidate.id === actionId)) {
    throw new GameRuleError(
      "ACTION_OUT_OF_TURN",
      `Action ${actionId} is not available in ${scene.id}.`
    );
  }

  const stateBefore = session.state;
  const stateAfter = applyStateDelta(stateBefore, action.delta);
  const isFinalAct = session.act === 3;
  const nextSession = GameSessionSchema.parse({
    ...session,
    status: isFinalAct ? "completed" : "playing",
    act: isFinalAct ? 3 : session.act + 1,
    state: stateAfter,
    ledger: {
      benefits: unique([...session.ledger.benefits, ...action.benefits]),
      costs: unique([...session.ledger.costs, ...action.costs]),
      facts: unique([...session.ledger.facts, ...action.addFacts]),
      commitments: unique([
        ...session.ledger.commitments,
        ...action.addCommitments
      ]),
      irreversibleEvents: unique([
        ...session.ledger.irreversibleEvents,
        ...action.irreversibleEvents
      ])
    },
    actionHistory: [...session.actionHistory, action.id],
    updatedAt: nowOrDefault(now)
  });

  return { session: nextSession, scene, action, stateBefore, stateAfter };
}

export function applyAssumptionCheck(
  session: GameSession,
  outcomes: OutcomeTemplates,
  assumptionId: string,
  evidenceOptionId: string,
  now?: string
): AssumptionCheckResult {
  if (!session.selectedWorld) {
    throw new GameRuleError(
      "WORLD_NOT_SELECTED",
      "Select a world before checking an assumption."
    );
  }
  if (session.blastedAssumptionId) {
    throw new GameRuleError(
      "ASSUMPTION_ALREADY_APPLIED",
      "Only one assumption may be checked per session."
    );
  }
  if (
    session.status !== "playing" ||
    session.act !== 3 ||
    session.actionHistory.length !== 2
  ) {
    throw new GameRuleError(
      "ASSUMPTION_WRONG_PHASE",
      "The assumption check belongs immediately before act three."
    );
  }
  const assumption = outcomes.assumptionBlasts.find(
    (candidate) => candidate.id === assumptionId
  );
  if (!assumption) {
    throw new GameRuleError(
      "ASSUMPTION_NOT_FOUND",
      `Assumption ${assumptionId} does not exist.`
    );
  }

  const evidenceOption = assumption.evidenceOptions.find(
    (option) => option.id === evidenceOptionId
  );
  if (!evidenceOption) {
    throw new GameRuleError(
      "ASSUMPTION_EVIDENCE_NOT_FOUND",
      `Evidence option ${evidenceOptionId} does not exist for ${assumptionId}.`
    );
  }

  const result = evidenceOption.result;
  const outcome = assumption.outcomes[result];
  const expectedStateEffect =
    result === "supported"
      ? "keep"
      : result === "contradicted"
        ? "reversal"
        : "uncertain";
  if (outcome.stateEffect !== expectedStateEffect) {
    throw new GameRuleError(
      "OUTCOME_TEMPLATE_NOT_FOUND",
      `Outcome ${result} is not configured for ${assumptionId}.`
    );
  }

  const worldId = session.selectedWorld;
  const stateBefore = session.state;
  const stateAfter = applyStateDelta(
    stateBefore,
    outcome.stateEffect === "reversal"
      ? assumption.deltaByWorld[worldId]
      : ZERO_DELTA
  );
  const facts =
    outcome.stateEffect === "reversal"
      ? [...assumption.addedFactsByWorld[worldId], outcome.fact]
      : [outcome.fact];
  const irreversibleEvents =
    outcome.stateEffect === "reversal"
      ? [
          ...assumption.irreversibleEventsByWorld[worldId],
          outcome.irreversibleEvent
        ]
      : [outcome.irreversibleEvent];
  const nextSession = GameSessionSchema.parse({
    ...session,
    state: stateAfter,
    ledger: {
      ...session.ledger,
      facts: unique([...session.ledger.facts, ...facts]),
      irreversibleEvents: unique([
        ...session.ledger.irreversibleEvents,
        ...irreversibleEvents
      ])
    },
    blastedAssumptionId: assumption.id,
    assumptionEvidenceId: evidenceOption.id,
    assumptionResult: result,
    updatedAt: nowOrDefault(now)
  });

  return {
    session: nextSession,
    assumptionId: assumption.id,
    evidenceOptionId: evidenceOption.id,
    result,
    outcome,
    stateBefore,
    stateAfter,
    narrative:
      outcome.stateEffect === "reversal"
        ? assumption.fallbackNarrativeByWorld[worldId]
        : outcome.narrative
  };
}

/**
 * Compatibility wrapper for the D08 Demo route. It deliberately chooses the
 * contradicted evidence option until the D11 UI starts passing a real choice.
 */
export function applyAssumptionBlast(
  session: GameSession,
  outcomes: OutcomeTemplates,
  assumptionId: string,
  now?: string
): AssumptionBlastResult {
  const assumption = outcomes.assumptionBlasts.find(
    (candidate) => candidate.id === assumptionId
  );
  if (!assumption) {
    throw new GameRuleError(
      "ASSUMPTION_NOT_FOUND",
      `Assumption ${assumptionId} does not exist.`
    );
  }
  const contradictedOption = assumption.evidenceOptions.find(
    (option) => option.result === "contradicted"
  );
  if (!contradictedOption) {
    throw new GameRuleError(
      "OUTCOME_TEMPLATE_NOT_FOUND",
      `No contradicted evidence option exists for ${assumptionId}.`
    );
  }
  return applyAssumptionCheck(
    session,
    outcomes,
    assumptionId,
    contradictedOption.id,
    now
  );
}

function requireExperiment(outcomes: OutcomeTemplates, experimentId: string) {
  const experiment = outcomes.sevenDayExperiments.find(
    (candidate) => candidate.id === experimentId
  );
  if (!experiment) {
    throw new GameRuleError(
      "EXPERIMENT_NOT_FOUND",
      `Experiment ${experimentId} does not exist.`
    );
  }
  return experiment;
}

export function startExperiment(
  session: GameSession,
  outcomes: OutcomeTemplates,
  experimentId: string,
  now?: string
): GameSession {
  if (session.status !== "completed") {
    throw new GameRuleError(
      "SESSION_NOT_COMPLETED",
      "Complete the route before starting a reality experiment."
    );
  }
  requireExperiment(outcomes, experimentId);
  if (session.experimentRun) {
    throw new GameRuleError(
      "EXPERIMENT_ALREADY_STARTED",
      "This session already has an experiment run."
    );
  }
  return GameSessionSchema.parse({
    ...session,
    experimentRun: {
      experimentId,
      status: "active",
      day: 0,
      events: [],
      evidenceScore: 0
    },
    updatedAt: nowOrDefault(now)
  });
}

export function advanceExperiment(
  session: GameSession,
  outcomes: OutcomeTemplates,
  experimentId: string,
  now?: string,
  options: ExperimentAdvanceOptions = {}
): { session: GameSession; day: number } {
  const experiment = requireExperiment(outcomes, experimentId);
  const run = session.experimentRun;
  if (!run || run.experimentId !== experiment.id) {
    throw new GameRuleError(
      "EXPERIMENT_NOT_STARTED",
      "Start this experiment before advancing a day."
    );
  }
  if (run.status === "completed" || run.day >= 7) {
    throw new GameRuleError(
      "EXPERIMENT_COMPLETED",
      "This experiment has already reached day 7."
    );
  }
  const day = run.day + 1;
  const existingEvents = run.events ?? [];
  const event = {
    day,
    choice: options.choice?.trim() || experiment.steps[Math.min(day - 1, 2)],
    ...(options.note?.trim() ? { note: options.note.trim() } : {}),
    ...(day === 4 ? { surprise: true } : {})
  };
  const evidenceScore = Math.min(
    100,
    (run.evidenceScore ?? 0) + (options.note?.trim() ? 18 : 12)
  );
  const nextSession = GameSessionSchema.parse({
    ...session,
    experimentRun: {
      experimentId: experiment.id,
      status: day === 7 ? "completed" : "active",
      day,
      events: [...existingEvents, event],
      evidenceScore,
      ...(day === 7 && run.feedback ? { feedback: run.feedback } : {})
    },
    updatedAt: nowOrDefault(now)
  });
  return { session: nextSession, day };
}

export function recordExperimentFeedback(
  session: GameSession,
  outcomes: OutcomeTemplates,
  experimentId: string,
  feedback: AssumptionResultKind,
  now?: string
): GameSession {
  const experiment = requireExperiment(outcomes, experimentId);
  const run = session.experimentRun;
  if (!run || run.experimentId !== experiment.id) {
    throw new GameRuleError(
      "EXPERIMENT_NOT_STARTED",
      "Start this experiment before recording feedback."
    );
  }
  if (run.status !== "completed" || run.day !== 7) {
    throw new GameRuleError(
      "EXPERIMENT_NOT_COMPLETED",
      "Advance the experiment through day 7 before recording feedback."
    );
  }
  return GameSessionSchema.parse({
    ...session,
    experimentRun: {
      ...run,
      feedback
    },
    updatedAt: nowOrDefault(now)
  });
}

function averageActDelta(world: World) {
  const result = { ...ZERO_DELTA };
  for (const scene of world.acts) {
    for (const key of STATE_KEYS) {
      result[key] +=
        scene.actions.reduce((sum, action) => sum + action.delta[key], 0) /
        scene.actions.length;
    }
  }
  return result;
}

function projectWorldState(
  world: World,
  calibration: CalibrationAnswers,
  outcomes: OutcomeTemplates,
  blastedAssumptionId?: string,
  assumptionResult?: AssumptionResultKind
) {
  let state = applyStateDelta(
    world.initialState,
    getCalibrationDelta(calibration)
  );
  state = applyStateDelta(state, averageActDelta(world));
  if (
    blastedAssumptionId &&
    (!assumptionResult || assumptionResult === "contradicted")
  ) {
    const assumption = outcomes.assumptionBlasts.find(
      (candidate) => candidate.id === blastedAssumptionId
    );
    if (assumption)
      state = applyStateDelta(state, assumption.deltaByWorld[world.id]);
  }
  return state;
}

function conditionMatches(condition: string, state: StateVector) {
  const matchesClause = (clause: string) => {
    const match = clause.trim().match(/^(\w+)\s*(>=|<=|>|<)\s*(\d+)$/);
    if (!match) return false;
    const [, rawKey, operator, rawValue] = match;
    if (!STATE_KEYS.includes(rawKey as keyof StateVector)) return false;
    const actual = state[rawKey as keyof StateVector];
    const expected = Number(rawValue);
    if (operator === ">=") return actual >= expected;
    if (operator === "<=") return actual <= expected;
    if (operator === ">") return actual > expected;
    return actual < expected;
  };

  return condition
    .split("||")
    .some((orGroup) => orGroup.split("&&").every(matchesClause));
}

function describeState(
  worldId: WorldId,
  state: StateVector,
  mode: WorldOutcome["mode"]
): WorldOutcome {
  const beneficialKeys = STATE_KEYS.filter((key) => key !== "wellbeingLoad");
  const dominantStrength = beneficialKeys.reduce((best, key) =>
    state[key] > state[best] ? key : best
  );
  const lowestBenefit = beneficialKeys.reduce((worst, key) =>
    state[key] < state[worst] ? key : worst
  );
  const pressurePoint =
    state.wellbeingLoad >= 65 ? "wellbeingLoad" : lowestBenefit;
  return { worldId, state, mode, dominantStrength, pressurePoint };
}

/**
 * Pick the next reality test from the current route instead of relying on
 * template order. Explicit metadata can narrow a test to a route or an
 * assumption result, while trigger actions keep the old content compatible.
 */
export function selectExperiment(
  session: GameSession,
  scenario: Scenario,
  outcomes: OutcomeTemplates
): ExperimentSelection {
  const actionLabels = new Map(
    scenario.worlds
      .flatMap((world) => world.acts)
      .flatMap((scene) => scene.actions)
      .map((action) => [action.id, action.label])
  );
  const actionIndexes = new Map(
    session.actionHistory.map((actionId, index) => [actionId, index])
  );

  const ranked = outcomes.sevenDayExperiments
    .map((candidate, index) => {
      const matchedActionIds = candidate.triggerActionIds.filter((actionId) =>
        actionIndexes.has(actionId)
      );
      const matchesWorld = Boolean(
        session.selectedWorld &&
          (!candidate.worldIds || candidate.worldIds.includes(session.selectedWorld))
      );
      const matchesAssumption = Boolean(
        session.assumptionResult &&
          (!candidate.assumptionResults ||
            candidate.assumptionResults.includes(session.assumptionResult))
      );
      const worldEligible =
        !candidate.worldIds ||
        Boolean(session.selectedWorld && candidate.worldIds.includes(session.selectedWorld));
      const assumptionEligible =
        !candidate.assumptionResults ||
        Boolean(
          session.assumptionResult &&
            candidate.assumptionResults.includes(session.assumptionResult)
        );

      const latestActionIndex = matchedActionIds.reduce(
        (latest, actionId) => Math.max(latest, actionIndexes.get(actionId) ?? -1),
        -1
      );
      const pressureScore = candidate.statePressureKeys
        ? candidate.statePressureKeys.reduce(
            (total, key) =>
              total +
              (key === "wellbeingLoad"
                ? session.state[key]
                : 100 - session.state[key]),
            0
          ) / candidate.statePressureKeys.length
        : 0;
      let score = candidate.priority ?? 0;
      score += matchedActionIds.length * 20;
      if (matchedActionIds.length > 0) score += 12;
      if (latestActionIndex >= 0) score += latestActionIndex * 2;
      if (candidate.worldIds && matchesWorld) score += 28;
      if (candidate.assumptionResults && matchesAssumption) score += 36;
      if (candidate.statePressureKeys) score += Math.round(pressureScore / 20);
      if (!worldEligible || !assumptionEligible) score = Number.NEGATIVE_INFINITY;

      return {
        candidate,
        index,
        score,
        matchedActionIds,
        latestActionIndex,
        matchesWorld,
        matchesAssumption,
        pressureScore
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.latestActionIndex - left.latestActionIndex ||
        right.matchedActionIds.length - left.matchedActionIds.length ||
        left.index - right.index
    );

  const chosen =
    ranked.find(
      (entry) =>
        Number.isFinite(entry.score) &&
        (entry.matchedActionIds.length > 0 ||
          (entry.candidate.worldIds && entry.matchesWorld) ||
          (entry.candidate.assumptionResults && entry.matchesAssumption))
    ) ??
    ranked.find((entry) => Number.isFinite(entry.score)) ??
    ranked[0];

  if (!chosen) {
    throw new GameRuleError(
      "OUTCOME_TEMPLATE_NOT_FOUND",
      "The outcome template pack is incomplete."
    );
  }

  const reasons: string[] = [];
  if (chosen.matchesWorld && chosen.candidate.worldIds) {
    const worldName = scenario.worlds.find(
      (world) => world.id === session.selectedWorld
    )?.name;
    if (worldName) reasons.push(`匹配当前路线：${worldName}`);
  }
  if (chosen.matchesAssumption && chosen.candidate.assumptionResults) {
    const resultLabel: Record<AssumptionResultKind, string> = {
      supported: "证据支持",
      contradicted: "证据冲突",
      inconclusive: "暂时不清楚"
    };
    if (session.assumptionResult) {
      reasons.push(`匹配假设结果：${resultLabel[session.assumptionResult]}`);
    }
  }
  if (chosen.matchedActionIds.length > 0) {
    const labels = chosen.matchedActionIds
      .map((actionId) => actionLabels.get(actionId))
      .filter((label): label is string => Boolean(label));
    if (labels.length > 0) reasons.push(`命中前面行动：${labels.join("、")}`);
  }
  if (chosen.candidate.statePressureKeys && chosen.pressureScore >= 60) {
    const pressureLabels = chosen.candidate.statePressureKeys.map(
      (key) => scenario.stateModel.dimensions[key]?.label ?? key
    );
    reasons.push(`当前压力更集中在：${pressureLabels.join("、")}`);
  }
  if (chosen.candidate.priority) {
    reasons.push("优先级用于处理多个同样匹配的实验");
  }
  if (reasons.length === 0) reasons.push("没有更具体的匹配，先从基础核验开始");

  return {
    experiment: chosen.candidate,
    score: Number.isFinite(chosen.score) ? chosen.score : 0,
    reasons
  };
}

export function calculateOutcome(
  session: GameSession,
  scenario: Scenario,
  outcomes: OutcomeTemplates
): OutcomeComparison {
  if (session.status !== "completed" || !session.selectedWorld) {
    throw new GameRuleError(
      "SESSION_NOT_COMPLETED",
      "Complete all three acts before calculating the outcome."
    );
  }
  const calibration = CalibrationAnswersSchema.parse(session.calibration);
  const worlds = scenario.worlds.map((world) => {
    const explored = world.id === session.selectedWorld;
    const state = explored
      ? session.state
      : projectWorldState(
          world,
          calibration,
          outcomes,
          session.blastedAssumptionId,
          session.assumptionResult
        );
    return describeState(
      world.id,
      state,
      explored ? "explored" : "scenario-profile"
    );
  });

  const matchingBlindSpots = outcomes.blindSpots.filter((blindSpot) =>
    blindSpot.triggerActionIds.some((actionId) =>
      session.actionHistory.includes(actionId)
    )
  );
  const worldLetters = outcomes.futureLetters.filter(
    (letter) => letter.worldId === session.selectedWorld
  );
  const futureLetter =
    worldLetters.find((letter) =>
      conditionMatches(letter.condition, session.state)
    ) ?? worldLetters[0];
  const experimentSelection = selectExperiment(session, scenario, outcomes);
  const experiment = experimentSelection.experiment;

  if (!futureLetter || !experiment) {
    throw new GameRuleError(
      "OUTCOME_TEMPLATE_NOT_FOUND",
      "The outcome template pack is incomplete."
    );
  }

  return {
    selectedWorld: session.selectedWorld,
    worlds,
    blindSpotIds: matchingBlindSpots
      .slice(0, 3)
      .map((blindSpot) => blindSpot.id),
    futureLetterId: futureLetter.id,
    experimentId: experiment.id,
    experimentSelection
  };
}

export function validateLedger(
  session: GameSession,
  scenario: Scenario
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const actions = scenario.worlds.flatMap((world) =>
    world.acts.flatMap((scene) => scene.actions)
  );
  const actionIds = new Set(actions.map((action) => action.id));
  const duplicateActions = session.actionHistory.filter(
    (actionId, index, history) => history.indexOf(actionId) !== index
  );

  for (const actionId of session.actionHistory) {
    if (!actionIds.has(actionId)) {
      issues.push({
        code: "UNKNOWN_ACTION",
        message: `Action history contains unknown action ${actionId}.`
      });
    }
  }
  if (duplicateActions.length > 0) {
    issues.push({
      code: "DUPLICATE_ACTION",
      message: "Action history contains duplicate actions."
    });
  }
  if (session.selectedWorld) {
    const worldActionIds = new Set(
      requireWorld(scenario, session.selectedWorld).acts.flatMap((scene) =>
        scene.actions.map((action) => action.id)
      )
    );
    if (
      session.actionHistory.some((actionId) => !worldActionIds.has(actionId))
    ) {
      issues.push({
        code: "CROSS_WORLD_ACTION",
        message: "Action history crosses world boundaries."
      });
    }
  }
  if (session.status === "completed" && session.actionHistory.length !== 3) {
    issues.push({
      code: "INCOMPLETE_HISTORY",
      message: "A completed session must contain exactly three actions."
    });
  }

  for (const [field, values] of Object.entries(session.ledger)) {
    if (new Set(values).size !== values.length) {
      issues.push({
        code: "DUPLICATE_LEDGER_ENTRY",
        message: `${field} contains duplicate entries.`
      });
    }
  }
  return issues;
}
