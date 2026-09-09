import { z } from "zod";

export const STATE_KEYS = [
  "cashSafety",
  "careerOptionality",
  "growthSlope",
  "relationshipCapital",
  "wellbeingLoad",
  "valueAlignment"
] as const;

export const WorldIdSchema = z.string().min(1);
export const ActNumberSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3)
]);
export const SourceIdSchema = z
  .string()
  .regex(/^zh-[a-z0-9][a-z0-9-]*-\d{2}$/, "must be a namespaced source ID");
const ZhihuUrlSchema = z
  .string()
  .url()
  .regex(
    /^https:\/\/(?:www|zhuanlan)\.zhihu\.com\//,
    "must be a Zhihu content URL"
  );

const boundedStateValue = z.number().finite().min(0).max(100);
const boundedDeltaValue = z.number().finite().min(-100).max(100);

export const StateVectorSchema = z
  .object({
    cashSafety: boundedStateValue,
    careerOptionality: boundedStateValue,
    growthSlope: boundedStateValue,
    relationshipCapital: boundedStateValue,
    wellbeingLoad: boundedStateValue,
    valueAlignment: boundedStateValue
  })
  .strict();

export const StateDeltaSchema = z
  .object({
    cashSafety: boundedDeltaValue,
    careerOptionality: boundedDeltaValue,
    growthSlope: boundedDeltaValue,
    relationshipCapital: boundedDeltaValue,
    wellbeingLoad: boundedDeltaValue,
    valueAlignment: boundedDeltaValue
  })
  .strict();

export const SourceCardSchema = z
  .object({
    id: SourceIdSchema,
    contentId: z.string().min(1),
    title: z.string().min(1),
    url: ZhihuUrlSchema,
    author: z.string().min(1),
    contentType: z.enum(["Answer", "Article"]),
    stance: z.enum(["support", "oppose", "conditional"]),
    categories: z.array(z.string().min(1)).min(1),
    claim: z.string().min(1),
    conditions: z.array(z.string().min(1)).min(1),
    consequence: z.string().min(1),
    authorityLevel: z.number().int().min(1).max(5),
    rankingScore: z.number().finite().nonnegative(),
    voteUpCount: z.number().int().nonnegative(),
    reviewStatus: z.literal("approved_with_caution"),
    reviewNote: z.string().min(1)
  })
  .strict();

export const SourceCardPackSchema = z
  .object({
    schemaVersion: z.literal(1),
    scenarioId: z.string().min(1),
    scenarioTitle: z.string().min(1),
    retrievedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source: z.literal("zhihu_open_platform"),
    reviewPolicy: z.literal("community_experience_for_scenario_only"),
    cards: z.array(SourceCardSchema).min(6).max(12)
  })
  .strict()
  .superRefine((pack, context) => {
    const ids = pack.cards.map((card) => card.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        message: "source card IDs must be unique",
        path: ["cards"]
      });
    }
  });

export const ActionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: z.string().min(1),
    delta: StateDeltaSchema,
    benefits: z.array(z.string().min(1)).min(1),
    costs: z.array(z.string().min(1)).min(1),
    addFacts: z.array(z.string().min(1)),
    addCommitments: z.array(z.string().min(1)),
    irreversibleEvents: z.array(z.string().min(1)),
    sourceIds: z.array(SourceIdSchema).min(1),
    fallbackOutcome: z.string().min(40)
  })
  .strict()
  .superRefine((action, context) => {
    const consequenceCount =
      action.addFacts.length +
      action.addCommitments.length +
      action.irreversibleEvents.length;
    if (consequenceCount === 0) {
      context.addIssue({
        code: "custom",
        message: "an action must add a fact, commitment, or irreversible event"
      });
    }
  });

export const EchoSchema = z
  .object({
    title: z.string().min(1),
    text: z.string().min(20),
    sourceIds: z.array(SourceIdSchema).min(1)
  })
  .strict();

export const SceneSchema = z
  .object({
    id: z.string().min(1),
    act: ActNumberSchema,
    timeLabel: z.string().min(1),
    sceneTitle: z.string().min(1),
    setup: z.string().min(1),
    fallbackNarrative: z.string().min(40),
    sourceIds: z.array(SourceIdSchema).min(1),
    actions: z.array(ActionSchema).length(3),
    echoes: z.record(z.string(), EchoSchema)
  })
  .strict();

export const WorldSchema = z
  .object({
    id: WorldIdSchema,
    name: z.string().min(1),
    tagline: z.string().min(1),
    initialState: StateVectorSchema,
    startingPoint: z.string().min(1),
    acts: z.array(SceneSchema).length(3)
  })
  .strict()
  .superRefine((world, context) => {
    const actNumbers = world.acts.map((scene) => scene.act);
    if (actNumbers.join(",") !== "1,2,3") {
      context.addIssue({
        code: "custom",
        message: "world acts must be ordered 1,2,3",
        path: ["acts"]
      });
    }

    for (const [index, scene] of world.acts.entries()) {
      if (Object.keys(scene.echoes).some((worldId) => worldId === world.id)) {
        context.addIssue({
          code: "custom",
          message: "scene echoes cannot target the current world",
          path: ["acts", index, "echoes"]
        });
      }
    }
  });

const StateDimensionSchema = z
  .object({
    label: z.string().min(1),
    higherIsBetter: z.boolean()
  })
  .strict();

export const ScenarioSchema = z
  .object({
    schemaVersion: z.literal(1),
    scenarioId: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    disclaimer: z.string().min(1),
    commonBaseline: StateVectorSchema,
    stateModel: z
      .object({
        range: z.tuple([z.literal(0), z.literal(100)]),
        dimensions: z
          .record(z.string().min(1), StateDimensionSchema)
          .refine(
            (dimensions) => Object.keys(dimensions).length > 0,
            "state model must define at least one dimension"
          )
      })
      .strict(),
    calibrationRules: z.array(z.string().min(1)).min(1),
    worlds: z.array(WorldSchema).length(3)
  })
  .strict()
  .superRefine((scenario, context) => {
    const worldIds = scenario.worlds.map((world) => world.id).sort();
    if (new Set(worldIds).size !== worldIds.length) {
      context.addIssue({
        code: "custom",
        message: "scenario world IDs must be unique",
        path: ["worlds"]
      });
    }
    for (const [worldIndex, world] of scenario.worlds.entries()) {
      const expectedEchoes = worldIds.filter((worldId) => worldId !== world.id);
      for (const [actIndex, scene] of world.acts.entries()) {
        const actualEchoes = Object.keys(scene.echoes).sort();
        if (actualEchoes.join(",") !== expectedEchoes.join(",")) {
          context.addIssue({
            code: "custom",
            message: `scene echoes must target the other worlds: ${expectedEchoes.join(", ")}`,
            path: ["worlds", worldIndex, "acts", actIndex, "echoes"]
          });
        }
      }
    }

    const sceneIds = scenario.worlds.flatMap((world) =>
      world.acts.map((scene) => scene.id)
    );
    const actionIds = scenario.worlds.flatMap((world) =>
      world.acts.flatMap((scene) => scene.actions.map((action) => action.id))
    );
    if (new Set(sceneIds).size !== sceneIds.length) {
      context.addIssue({
        code: "custom",
        message: "scene IDs must be unique",
        path: ["worlds"]
      });
    }
    if (new Set(actionIds).size !== actionIds.length) {
      context.addIssue({
        code: "custom",
        message: "action IDs must be unique",
        path: ["worlds"]
      });
    }
  });

const worldStateMap = <Schema extends z.ZodTypeAny>(valueSchema: Schema) =>
  z
    .record(WorldIdSchema, valueSchema)
    .refine(
      (value) => Object.keys(value).length > 0,
      "world map must contain at least one world"
    );

export const AssumptionResultKindSchema = z.enum([
  "supported",
  "contradicted",
  "inconclusive"
]);

const AssumptionEvidenceOptionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    detail: z.string().min(1),
    result: AssumptionResultKindSchema
  })
  .strict();

const AssumptionOutcomeSchema = z
  .object({
    label: z.string().min(1),
    narrative: z.string().min(20),
    stateEffect: z.enum(["keep", "reversal", "uncertain"]),
    fact: z.string().min(1),
    irreversibleEvent: z.string().min(1)
  })
  .strict();

export const AssumptionCheckSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    premise: z.string().min(1),
    checkQuestion: z.string().min(1),
    evidenceOptions: z.array(AssumptionEvidenceOptionSchema).length(3),
    outcomes: z
      .object({
        supported: AssumptionOutcomeSchema,
        contradicted: AssumptionOutcomeSchema,
        inconclusive: AssumptionOutcomeSchema
      })
      .strict(),
    reversal: z.string().min(1),
    sourceIds: z.array(SourceIdSchema).min(1),
    deltaByWorld: worldStateMap(StateDeltaSchema),
    addedFactsByWorld: worldStateMap(z.array(z.string().min(1)).min(1)),
    irreversibleEventsByWorld: worldStateMap(z.array(z.string().min(1)).min(1)),
    fallbackNarrativeByWorld: worldStateMap(z.string().min(40)),
    realityTest: z.array(z.string().min(1)).length(3)
  })
  .strict();

// 保留旧名称，供 D10 引擎迁移期间继续兼容现有调用。
export const AssumptionBlastSchema = AssumptionCheckSchema;

export const OutcomeTemplatesSchema = z
  .object({
    schemaVersion: z.literal(1),
    scenarioId: z.string().min(1),
    resultSections: z
      .array(
        z
          .object({
            id: z.string().min(1),
            title: z.string().min(1),
            description: z.string().min(1)
          })
          .strict()
      )
      .min(1),
    assumptionBlasts: z.array(AssumptionBlastSchema).length(3),
    blindSpots: z
      .array(
        z
          .object({
            id: z.string().min(1),
            title: z.string().min(1),
            triggerActionIds: z.array(z.string().min(1)).min(1),
            text: z.string().min(1),
            sourceIds: z.array(SourceIdSchema).min(1)
          })
          .strict()
      )
      .min(9),
    futureLetters: z
      .array(
        z
          .object({
            id: z.string().min(1),
            worldId: WorldIdSchema,
            tone: z.string().min(1),
            condition: z.string().min(1),
            template: z.string().min(40),
            sourceIds: z.array(SourceIdSchema).min(1)
          })
          .strict()
      )
      .min(9),
    sevenDayExperiments: z
      .array(
        z
          .object({
            id: z.string().min(1),
            title: z.string().min(1),
            triggerActionIds: z.array(z.string().min(1)).min(1),
            /** Optional routing metadata used by the D24 selector. */
            worldIds: z.array(WorldIdSchema).min(1).optional(),
            assumptionResults: z
              .array(AssumptionResultKindSchema)
              .min(1)
              .optional(),
            statePressureKeys: z.array(z.enum(STATE_KEYS)).min(1).optional(),
            priority: z.number().int().min(-100).max(100).optional(),
            question: z.string().min(1),
            whyNow: z.string().min(1),
            steps: z.array(z.string().min(1)).length(3),
            simulationDays: z
              .array(
                z
                  .object({
                    day: z.number().int().min(1).max(7),
                    title: z.string().min(1),
                    situation: z.string().min(1),
                    action: z.string().min(1),
                    evidence: z.string().min(1),
                    choices: z
                      .array(z.string().min(1))
                      .min(2)
                      .max(3)
                      .optional(),
                    evidencePrompt: z.string().min(1).optional(),
                    surprise: z.boolean().optional()
                  })
                  .strict()
              )
              .length(7)
              .optional(),
            evidence: z.string().min(1),
            resultMeaning: z
              .object({
                supported: z.string().min(1),
                contradicted: z.string().min(1),
                inconclusive: z.string().min(1)
              })
              .strict(),
            nextStep: z
              .object({
                supported: z.string().min(1),
                contradicted: z.string().min(1),
                inconclusive: z.string().min(1)
              })
              .strict(),
            timeBudget: z.string().min(1),
            moneyBudget: z.string().min(1),
            exitRule: z.string().min(1),
            sourceIds: z.array(SourceIdSchema).min(1)
          })
          .strict()
      )
      .min(9),
    offlineFallback: z
      .object({
        selectionRule: z.string().min(1),
        futureLetterLabel: z.string().min(1),
        sourceDisclaimer: z.string().min(1),
        minimumSources: z.number().int().min(3)
      })
      .strict()
  })
  .strict();

export const CalibrationAnswersSchema = z
  .object({
    runway: z.enum(["under-3", "3-6", "6-12", "12-24", "over-24"]),
    sharedRisk: z.enum(["self", "partner", "dependents", "multiple"]),
    primaryFear: z.enum([
      "miss-opportunity",
      "financial-loss",
      "relationship-damage",
      "growth-stagnation"
    ]),
    primaryGoal: z.enum(["stability", "growth", "autonomy", "meaning"]),
    uncertaintyStyle: z.enum(["act-first", "validate-first", "prepare-first"])
  })
  .strict();

export const CommitmentLedgerSchema = z
  .object({
    benefits: z.array(z.string()),
    costs: z.array(z.string()),
    facts: z.array(z.string()),
    commitments: z.array(z.string()),
    irreversibleEvents: z.array(z.string())
  })
  .strict();

export const ExperimentModeSchema = z.enum(["demo", "real"]);
export const ExperimentEventStatusSchema = z.enum(["completed", "skipped"]);
export const EvidenceTypeSchema = z.enum([
  "document",
  "conversation",
  "observation",
  "number",
  "other"
]);
export const FeelingSchema = z.enum([
  "clearer",
  "steady",
  "stretched",
  "blocked"
]);
const CalendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ExperimentRunSchema = z
  .object({
    experimentId: z.string().min(1),
    mode: ExperimentModeSchema.default("real"),
    status: z.enum(["active", "completed", "stopped"]),
    day: z.number().int().min(0).max(7),
    feedback: AssumptionResultKindSchema.optional(),
    startedOn: CalendarDateSchema.optional(),
    nextAvailableOn: CalendarDateSchema.optional(),
    stoppedAt: z.string().datetime().optional(),
    stopReason: z.string().min(1).max(240).optional(),
    events: z
      .array(
        z
          .object({
            day: z.number().int().min(1).max(7),
            choice: z.string().min(1),
            note: z.string().max(240).optional(),
            surprise: z.boolean().optional(),
            status: ExperimentEventStatusSchema.default("completed"),
            occurredOn: CalendarDateSchema.optional(),
            evidenceType: EvidenceTypeSchema.optional(),
            feeling: FeelingSchema.optional(),
            nextStep: z.string().max(240).optional()
          })
          .strict()
      )
      .max(7)
      .optional(),
    evidenceScore: z.number().int().min(0).max(100).optional()
  })
  .strict()
  .superRefine((run, context) => {
    if (run.status === "completed" && run.day !== 7) {
      context.addIssue({
        code: "custom",
        message: "a completed experiment must reach day 7",
        path: ["day"]
      });
    }
    if (run.feedback && run.status !== "completed") {
      context.addIssue({
        code: "custom",
        message: "experiment feedback requires a completed experiment",
        path: ["feedback"]
      });
    }
    if (run.status === "stopped" && !run.stopReason) {
      context.addIssue({
        code: "custom",
        message: "a stopped experiment requires a reason",
        path: ["stopReason"]
      });
    }
  });

export const GameSessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    scenarioId: z.string().min(1),
    status: z.enum([
      "calibrating",
      "forging",
      "choosing",
      "playing",
      "completed"
    ]),
    calibration: CalibrationAnswersSchema.partial(),
    selectedWorld: WorldIdSchema.optional(),
    act: ActNumberSchema,
    state: StateVectorSchema,
    ledger: CommitmentLedgerSchema,
    actionHistory: z.array(z.string()),
    blastedAssumptionId: z.string().optional(),
    assumptionEvidenceId: z.string().optional(),
    assumptionResult: AssumptionResultKindSchema.optional(),
    experimentRun: ExperimentRunSchema.optional(),
    seed: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .strict();

export type StateVector = z.infer<typeof StateVectorSchema>;
export type StateDelta = z.infer<typeof StateDeltaSchema>;
export type SourceCard = z.infer<typeof SourceCardSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type World = z.infer<typeof WorldSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type OutcomeTemplates = z.infer<typeof OutcomeTemplatesSchema>;
export type ExperimentDay = NonNullable<
  OutcomeTemplates["sevenDayExperiments"][number]["simulationDays"]
>[number];
export type AssumptionResultKind = z.infer<typeof AssumptionResultKindSchema>;
export type ExperimentMode = z.infer<typeof ExperimentModeSchema>;
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;
export type Feeling = z.infer<typeof FeelingSchema>;
export type AssumptionCheck = z.infer<typeof AssumptionCheckSchema>;
export type CalibrationAnswers = z.infer<typeof CalibrationAnswersSchema>;
export type CommitmentLedger = z.infer<typeof CommitmentLedgerSchema>;
export type GameSession = z.infer<typeof GameSessionSchema>;
export type WorldId = z.infer<typeof WorldIdSchema>;
export type ActNumber = z.infer<typeof ActNumberSchema>;
