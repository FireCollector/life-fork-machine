import {
  STATE_KEYS,
  CalibrationAnswersSchema,
  GameSessionSchema,
  type Action,
  type AssumptionCheck,
  type AssumptionResultKind,
  type CalibrationAnswers,
  type CommitmentLedger,
  type EvidenceSignal,
  type EvidenceType,
  type ExperimentAdjustment,
  type ExperimentBlocker,
  type ExperimentMode,
  type Feeling,
  type GameSession,
  type OutcomeTemplates,
  type Scenario,
  type Scene,
  type StateDelta,
  type StateVector,
  type World,
  type WorldId
} from "./schema";
import { getExperimentDays } from "./experiment-simulation";

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
  | "EXPERIMENT_STOPPED"
  | "EXPERIMENT_DATE_LOCKED"
  | "EXPERIMENT_RESCHEDULE_INVALID"
  | "EXPERIMENT_ADJUSTMENT_NOT_FOUND"
  | "EXPERIMENT_ADJUSTMENT_INVALID"
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
  entryStatus?: "completed" | "skipped";
  evidenceType?: EvidenceType;
  feeling?: Feeling;
  evidenceSignal?: EvidenceSignal;
  blocker?: ExperimentBlocker;
  nextStep?: string;
}

export interface ExperimentStartOptions {
  /** Demo mode is deliberately fast; regular product entry passes `real`. */
  mode?: ExperimentMode;
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
    seed:
      options.seed ??
      session.seed +
        scenario.worlds.findIndex((world) => world.id === worldId) +
        1
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

function calendarDate(now?: string) {
  return nowOrDefault(now).slice(0, 10);
}

function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function adjustmentForEvent(
  experiment: OutcomeTemplates["sevenDayExperiments"][number],
  event: {
    day: number;
    status: "completed" | "skipped";
    evidenceSignal?: EvidenceSignal;
    blocker?: ExperimentBlocker;
    feeling?: Feeling;
  },
  now: string
): ExperimentAdjustment | undefined {
  if (event.day >= 7) return undefined;

  const targetDay = event.day + 1;
  const originalAction =
    getExperimentDays(experiment)[targetDay - 1]?.action ??
    experiment.steps[Math.min(targetDay - 1, experiment.steps.length - 1)];

  let reason: ExperimentAdjustment["reason"] = "information_missing";
  let recommendedAction = `先把「${originalAction}」缩小成一件 20 分钟内能完成的补信息动作。`;
  let explanation = `第 ${event.day} 天的信息仍不足以支持或推翻原假设；先补一个关键缺口，不急着下结论。`;

  if (event.status === "skipped") {
    reason = "skipped";
    recommendedAction = `把「${originalAction}」改成一个可在 10 分钟内完成的最小动作，再决定是否继续。`;
    explanation = `第 ${event.day} 天被跳过；先降低下一步门槛，避免用补课式任务制造压力。`;
  } else if (event.blocker === "no_response") {
    reason = "no_response";
    recommendedAction =
      "发出一条带明确截止时间的问题，同时找一个不依赖对方回复的备用信息源。";
    explanation = `第 ${event.day} 天记录了“对方未回复”；这只能说明信息暂时缺失，不能当成否定证据。`;
  } else if (event.blocker === "missing_material") {
    reason = "missing_material";
    recommendedAction =
      "把缺少的材料列成清单，先找一份可替代的公开记录或确认获取时间。";
    explanation = `第 ${event.day} 天缺少材料；下一步先验证材料能否获得，不根据空白补出结论。`;
  } else if (event.blocker === "conditions_changed") {
    reason = "conditions_changed";
    recommendedAction =
      "把变化后的条件写成一条新约束，并只重估受它影响的那一项。";
    explanation = `第 ${event.day} 天出现条件变化；旧计划不应直接沿用，需要先确认哪项前提失效。`;
  } else if (
    event.blocker === "time_or_cost" ||
    event.feeling === "stretched" ||
    event.feeling === "blocked"
  ) {
    reason = "capacity_risk";
    recommendedAction = `把「${originalAction}」缩小到一个时间和成本上限明确的小动作；超过上限就停止。`;
    explanation = `第 ${event.day} 天显示时间、成本或精力承受度偏高；先控制投入，再继续取证。`;
  } else if (event.evidenceSignal === "contradicted") {
    reason = "evidence_contradicted";
    recommendedAction =
      "先追问一条会改变判断的反例，并暂停扩大承诺，直到关键矛盾被解释。";
    explanation = `第 ${event.day} 天的记录与原假设相冲突；下一步应查清冲突，而不是忽略它或直接反向下注。`;
  } else if (event.evidenceSignal === "supported") {
    reason = "evidence_supported";
    recommendedAction = `在保留原有上限的前提下，补一个能复核「${originalAction}」的具体细节。`;
    explanation = `第 ${event.day} 天出现支持原假设的信息；单条信息还不够，下一步验证它是否可复核。`;
  }

  return {
    id: `adjustment-day-${event.day}`,
    sourceDay: event.day,
    targetDay,
    reason,
    ...(event.evidenceSignal ? { evidenceSignal: event.evidenceSignal } : {}),
    ...(event.blocker ? { blocker: event.blocker } : {}),
    originalAction,
    recommendedAction,
    explanation,
    status: "suggested",
    createdAt: now
  };
}

export function getExperimentAdjustment(
  session: GameSession,
  experimentId: string,
  targetDay: number
) {
  const run = session.experimentRun;
  if (!run || run.experimentId !== experimentId) return undefined;
  return (run.adjustments ?? []).find(
    (adjustment) => adjustment.targetDay === targetDay
  );
}

export function getExperimentAvailability(
  session: GameSession,
  experimentId: string,
  now?: string
) {
  const run = session.experimentRun;
  if (!run || run.experimentId !== experimentId) {
    return { available: false, reason: "实验尚未开始" } as const;
  }
  if (run.status === "stopped") {
    return { available: false, reason: "实验已提前停止" } as const;
  }
  if (run.status === "completed") {
    return { available: false, reason: "七天记录已完成" } as const;
  }
  if (run.mode === "demo") return { available: true } as const;

  const today = calendarDate(now);
  const availableOn = run.nextAvailableOn ?? run.startedOn ?? today;
  if (today < availableOn) {
    return {
      available: false,
      availableOn,
      reason: `下一条记录会在 ${availableOn} 解锁`
    } as const;
  }
  return { available: true, availableOn } as const;
}

export function startExperiment(
  session: GameSession,
  outcomes: OutcomeTemplates,
  experimentId: string,
  now?: string,
  options: ExperimentStartOptions = {}
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
  const mode = options.mode ?? "demo";
  const startedOn = calendarDate(now);
  return GameSessionSchema.parse({
    ...session,
    experimentRun: {
      experimentId,
      mode,
      status: "active",
      day: 0,
      events: [],
      evidenceScore: 0,
      ...(mode === "real" ? { startedOn, nextAvailableOn: startedOn } : {})
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
  if (run.status === "stopped") {
    throw new GameRuleError(
      "EXPERIMENT_STOPPED",
      "This experiment was stopped and cannot accept more records."
    );
  }
  if (run.status === "completed" || run.day >= 7) {
    throw new GameRuleError(
      "EXPERIMENT_COMPLETED",
      "This experiment has already reached day 7."
    );
  }
  const availability = getExperimentAvailability(session, experimentId, now);
  if (!availability.available) {
    throw new GameRuleError("EXPERIMENT_DATE_LOCKED", availability.reason);
  }
  const day = run.day + 1;
  const occurredOn = calendarDate(now);
  const existingEvents = run.events ?? [];
  const event = {
    day,
    choice: options.choice?.trim() || experiment.steps[Math.min(day - 1, 2)],
    ...(options.note?.trim() ? { note: options.note.trim() } : {}),
    status: options.entryStatus ?? "completed",
    ...(run.mode === "real" ? { occurredOn } : {}),
    ...(options.evidenceType ? { evidenceType: options.evidenceType } : {}),
    ...(options.feeling ? { feeling: options.feeling } : {}),
    ...(options.evidenceSignal
      ? { evidenceSignal: options.evidenceSignal }
      : {}),
    ...(options.blocker ? { blocker: options.blocker } : {}),
    ...(options.nextStep?.trim() ? { nextStep: options.nextStep.trim() } : {}),
    ...(day === 4 ? { surprise: true } : {})
  };
  const evidenceScore = Math.min(
    100,
    (run.evidenceScore ?? 0) + (options.note?.trim() ? 18 : 12)
  );
  const adjustment =
    run.mode === "real"
      ? adjustmentForEvent(experiment, event, nowOrDefault(now))
      : undefined;
  const nextSession = GameSessionSchema.parse({
    ...session,
    experimentRun: {
      experimentId: experiment.id,
      mode: run.mode,
      status: day === 7 ? "completed" : "active",
      day,
      events: [...existingEvents, event],
      ...(adjustment
        ? { adjustments: [...(run.adjustments ?? []), adjustment] }
        : run.adjustments
          ? { adjustments: run.adjustments }
          : {}),
      evidenceScore,
      ...(run.mode === "real" && day < 7
        ? {
            startedOn: run.startedOn ?? occurredOn,
            nextAvailableOn: addCalendarDays(run.startedOn ?? occurredOn, day)
          }
        : {}),
      ...(day === 7 && run.feedback ? { feedback: run.feedback } : {})
    },
    updatedAt: nowOrDefault(now)
  });
  return { session: nextSession, day };
}

function requireAdjustableExperiment(
  session: GameSession,
  experimentId: string,
  adjustmentId: string
) {
  const run = session.experimentRun;
  if (!run || run.experimentId !== experimentId) {
    throw new GameRuleError(
      "EXPERIMENT_NOT_STARTED",
      "Start this experiment first."
    );
  }
  if (run.mode !== "real" || run.status !== "active") {
    throw new GameRuleError(
      "EXPERIMENT_ADJUSTMENT_INVALID",
      "Only an active real experiment can change a suggested adjustment."
    );
  }
  const adjustment = (run.adjustments ?? []).find(
    (item) => item.id === adjustmentId
  );
  if (!adjustment) {
    throw new GameRuleError(
      "EXPERIMENT_ADJUSTMENT_NOT_FOUND",
      "This experiment adjustment does not exist."
    );
  }
  if (adjustment.targetDay !== run.day + 1) {
    throw new GameRuleError(
      "EXPERIMENT_ADJUSTMENT_INVALID",
      "Only the next adjustment can be changed."
    );
  }
  return { run, adjustment };
}

function replaceAdjustment(
  session: GameSession,
  experimentId: string,
  adjustmentId: string,
  next: ExperimentAdjustment,
  now?: string
) {
  const run = session.experimentRun;
  if (!run || run.experimentId !== experimentId) {
    throw new GameRuleError(
      "EXPERIMENT_NOT_STARTED",
      "Start this experiment first."
    );
  }
  return GameSessionSchema.parse({
    ...session,
    experimentRun: {
      ...run,
      adjustments: (run.adjustments ?? []).map((item) =>
        item.id === adjustmentId ? next : item
      )
    },
    updatedAt: nowOrDefault(now)
  });
}

export function acceptExperimentAdjustment(
  session: GameSession,
  experimentId: string,
  adjustmentId: string,
  now?: string
) {
  const { adjustment } = requireAdjustableExperiment(
    session,
    experimentId,
    adjustmentId
  );
  if (adjustment.status !== "suggested") {
    throw new GameRuleError(
      "EXPERIMENT_ADJUSTMENT_INVALID",
      "This adjustment has already been handled."
    );
  }
  return replaceAdjustment(
    session,
    experimentId,
    adjustmentId,
    {
      ...adjustment,
      status: "accepted",
      appliedAction: adjustment.recommendedAction,
      updatedAt: nowOrDefault(now)
    },
    now
  );
}

export function customizeExperimentAdjustment(
  session: GameSession,
  experimentId: string,
  adjustmentId: string,
  action: string,
  now?: string
) {
  const { adjustment } = requireAdjustableExperiment(
    session,
    experimentId,
    adjustmentId
  );
  if (adjustment.status !== "suggested") {
    throw new GameRuleError(
      "EXPERIMENT_ADJUSTMENT_INVALID",
      "This adjustment has already been handled."
    );
  }
  const safeAction = action.trim();
  if (!safeAction || safeAction.length > 240) {
    throw new GameRuleError(
      "EXPERIMENT_ADJUSTMENT_INVALID",
      "Write a short, concrete next action before saving it."
    );
  }
  return replaceAdjustment(
    session,
    experimentId,
    adjustmentId,
    {
      ...adjustment,
      status: "customized",
      appliedAction: safeAction,
      updatedAt: nowOrDefault(now)
    },
    now
  );
}

export function revertExperimentAdjustment(
  session: GameSession,
  experimentId: string,
  adjustmentId: string,
  now?: string
) {
  const { adjustment } = requireAdjustableExperiment(
    session,
    experimentId,
    adjustmentId
  );
  if (adjustment.status === "reverted") {
    throw new GameRuleError(
      "EXPERIMENT_ADJUSTMENT_INVALID",
      "This adjustment already uses the original plan."
    );
  }
  return replaceAdjustment(
    session,
    experimentId,
    adjustmentId,
    {
      ...adjustment,
      status: "reverted",
      updatedAt: nowOrDefault(now)
    },
    now
  );
}

export function skipExperimentDay(
  session: GameSession,
  outcomes: OutcomeTemplates,
  experimentId: string,
  now?: string,
  note?: string
) {
  return advanceExperiment(session, outcomes, experimentId, now, {
    choice: "今天跳过，已记录原因",
    note,
    entryStatus: "skipped"
  });
}

export function rescheduleExperiment(
  session: GameSession,
  experimentId: string,
  nextAvailableOn: string,
  now?: string
): GameSession {
  const run = session.experimentRun;
  if (!run || run.experimentId !== experimentId) {
    throw new GameRuleError(
      "EXPERIMENT_NOT_STARTED",
      "Start this experiment first."
    );
  }
  if (run.mode !== "real" || run.status !== "active") {
    throw new GameRuleError(
      "EXPERIMENT_RESCHEDULE_INVALID",
      "Only an active real experiment can be rescheduled."
    );
  }
  const today = calendarDate(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextAvailableOn) || nextAvailableOn < today) {
    throw new GameRuleError(
      "EXPERIMENT_RESCHEDULE_INVALID",
      "Choose today or a future calendar date."
    );
  }
  return GameSessionSchema.parse({
    ...session,
    experimentRun: { ...run, nextAvailableOn },
    updatedAt: nowOrDefault(now)
  });
}

export function stopExperiment(
  session: GameSession,
  experimentId: string,
  reason: string,
  now?: string
): GameSession {
  const run = session.experimentRun;
  const safeReason = reason.trim();
  if (!run || run.experimentId !== experimentId) {
    throw new GameRuleError(
      "EXPERIMENT_NOT_STARTED",
      "Start this experiment first."
    );
  }
  if (run.status !== "active" || !safeReason) {
    throw new GameRuleError(
      "EXPERIMENT_STOPPED",
      "Only an active experiment with a recorded reason can be stopped."
    );
  }
  return GameSessionSchema.parse({
    ...session,
    experimentRun: {
      ...run,
      status: "stopped",
      stoppedAt: nowOrDefault(now),
      stopReason: safeReason
    },
    updatedAt: nowOrDefault(now)
  });
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
        (!candidate.worldIds ||
          candidate.worldIds.includes(session.selectedWorld))
      );
      const matchesAssumption = Boolean(
        session.assumptionResult &&
        (!candidate.assumptionResults ||
          candidate.assumptionResults.includes(session.assumptionResult))
      );
      const worldEligible =
        !candidate.worldIds ||
        Boolean(
          session.selectedWorld &&
          candidate.worldIds.includes(session.selectedWorld)
        );
      const assumptionEligible =
        !candidate.assumptionResults ||
        Boolean(
          session.assumptionResult &&
          candidate.assumptionResults.includes(session.assumptionResult)
        );

      const latestActionIndex = matchedActionIds.reduce(
        (latest, actionId) =>
          Math.max(latest, actionIndexes.get(actionId) ?? -1),
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
      if (!worldEligible || !assumptionEligible)
        score = Number.NEGATIVE_INFINITY;

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
