import { z } from "zod";

import { SourceIdSchema } from "../game/schema";

const ShortTextSchema = z.string().trim().min(1).max(280);
const ParagraphSchema = z.string().trim().min(1).max(1_200);

/**
 * The only evidence handle an AI result may use. The caller supplies the
 * allowed IDs from reviewed retrieval results and validates them again with
 * `parseAiCandidateBundle`; the model never invents a source record.
 */
export const AiCitationSchema = z
  .object({
    sourceId: SourceIdSchema,
    use: z.enum(["context", "claim", "counterpoint", "condition"]),
    note: ShortTextSchema.optional()
  })
  .strict();

export const AiEvidenceInputSchema = z
  .object({
    id: SourceIdSchema,
    title: ShortTextSchema,
    author: ShortTextSchema,
    claim: ParagraphSchema,
    conditions: z.array(ShortTextSchema).min(1).max(6),
    stance: z.enum(["support", "oppose", "conditional"]),
    url: z.string().url()
  })
  .strict();

export const AiTopicInputSchema = z
  .object({
    rawQuestion: z.string().trim().min(4).max(800),
    locale: z.literal("zh-CN"),
    decisionDeadline: z.string().trim().max(80).optional(),
    confirmedConstraints: z
      .array(
        z
          .object({
            category: z.enum([
              "cash",
              "time",
              "relationship",
              "location",
              "career",
              "other"
            ]),
            text: ShortTextSchema
          })
          .strict()
      )
      .max(12)
  })
  .strict();

export const AiGenerationRequestSchema = z
  .object({
    contractVersion: z.literal(1),
    requestId: z.string().trim().min(1).max(100),
    task: z.enum([
      "understand-topic",
      "synthesize-evidence",
      "propose-next-steps",
      "explain-candidate"
    ]),
    topic: AiTopicInputSchema,
    evidence: z.array(AiEvidenceInputSchema).min(3).max(12),
    instruction: z.literal(
      "Return a reviewable candidate. Do not predict outcomes, recommend a best route, or mutate game state."
    )
  })
  .strict()
  .superRefine((request, context) => {
    const sourceIds = request.evidence.map((source) => source.id);
    if (new Set(sourceIds).size !== sourceIds.length) {
      context.addIssue({
        code: "custom",
        message: "evidence IDs must be unique",
        path: ["evidence"]
      });
    }
  });

const CandidateClaimSchema = z
  .object({
    text: ParagraphSchema,
    citations: z.array(AiCitationSchema).min(1).max(4),
    confidence: z.enum(["high", "medium", "low"]),
    uncertainty: ShortTextSchema
  })
  .strict();

const CandidateRouteSchema = z
  .object({
    id: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9-]{1,48}$/),
    label: ShortTextSchema,
    tradeoff: CandidateClaimSchema,
    unknownToVerify: CandidateClaimSchema
  })
  .strict();

const CandidateActionSchema = z
  .object({
    label: ShortTextSchema,
    purpose: ShortTextSchema,
    evidenceArtifact: ShortTextSchema,
    timeBudget: ShortTextSchema,
    moneyBudget: ShortTextSchema,
    exitRule: ShortTextSchema,
    citations: z.array(AiCitationSchema).min(1).max(4)
  })
  .strict();

const CandidateExperimentSchema = z
  .object({
    title: ShortTextSchema,
    keyQuestion: ShortTextSchema,
    steps: z.array(CandidateActionSchema).min(1).max(3),
    resultInterpretation: z
      .object({
        supported: ShortTextSchema,
        contradicted: ShortTextSchema,
        inconclusive: ShortTextSchema
      })
      .strict(),
    reminder: z.literal("这是实验建议，不是已执行的事实。")
  })
  .strict();

export const AiCandidateBundleSchema = z
  .object({
    contractVersion: z.literal(1),
    provenance: z.literal("ai-generated-candidate"),
    metadata: z
      .object({
        provider: z.string().trim().min(1).max(80),
        model: z.string().trim().min(1).max(120),
        generatedAt: z.string().datetime(),
        promptVersion: z.string().trim().min(1).max(80)
      })
      .strict(),
    topic: z
      .object({
        normalizedQuestion: ShortTextSchema,
        scope: z.enum(["career", "education", "relocation", "mixed"]),
        tension: ParagraphSchema,
        acknowledgedConstraints: z.array(ShortTextSchema).max(12),
        missingInformation: z.array(ShortTextSchema).min(1).max(6)
      })
      .strict(),
    evidenceSynthesis: z
      .object({
        agreements: z.array(CandidateClaimSchema).min(1).max(4),
        disagreements: z.array(CandidateClaimSchema).min(1).max(4),
        applicabilityWarnings: z.array(CandidateClaimSchema).min(1).max(4)
      })
      .strict(),
    routes: z.array(CandidateRouteSchema).min(2).max(3),
    assumptions: z
      .array(
        z
          .object({
            label: ShortTextSchema,
            whyItMatters: CandidateClaimSchema,
            checkQuestion: ShortTextSchema
          })
          .strict()
      )
      .min(1)
      .max(4),
    proposedActions: z.array(CandidateActionSchema).min(1).max(3),
    experiment: CandidateExperimentSchema,
    explanation: z
      .object({
        whatThisCanDo: ShortTextSchema,
        whatThisCannotDo: z.literal("不能预测结果、给出最佳路线或替你做决定。"),
        nextReviewStep: z.literal(
          "需要证据审核和人工确认后，才能进入正式推演。"
        )
      })
      .strict(),
    review: z
      .object({
        status: z.enum([
          "needs-evidence-review",
          "needs-editor-review",
          "blocked"
        ]),
        reasons: z.array(ShortTextSchema).min(1).max(6)
      })
      .strict()
  })
  .strict()
  .superRefine((bundle, context) => {
    const routeIds = bundle.routes.map((route) => route.id);
    if (new Set(routeIds).size !== routeIds.length) {
      context.addIssue({
        code: "custom",
        message: "route IDs must be unique",
        path: ["routes"]
      });
    }
  });

export const AiFailureCodeSchema = z.enum([
  "timeout",
  "provider-unavailable",
  "invalid-output",
  "insufficient-evidence",
  "citation-conflict",
  "sensitive-topic",
  "policy-refusal"
]);

export const AiFailureSchema = z
  .object({
    contractVersion: z.literal(1),
    provenance: z.literal("ai-failure"),
    code: AiFailureCodeSchema,
    retryable: z.boolean(),
    userMessage: ShortTextSchema,
    fallback: z.enum([
      "ask-user",
      "manual-review",
      "deterministic-demo",
      "stop"
    ]),
    diagnostic: ShortTextSchema
  })
  .strict();

export const AiGenerationResultSchema = z.discriminatedUnion("provenance", [
  AiCandidateBundleSchema,
  AiFailureSchema
]);

export type AiGenerationRequest = z.infer<typeof AiGenerationRequestSchema>;
export type AiCandidateBundle = z.infer<typeof AiCandidateBundleSchema>;
export type AiFailure = z.infer<typeof AiFailureSchema>;
export type AiGenerationResult = z.infer<typeof AiGenerationResultSchema>;

function collectCitations(bundle: AiCandidateBundle) {
  return [
    ...bundle.evidenceSynthesis.agreements,
    ...bundle.evidenceSynthesis.disagreements,
    ...bundle.evidenceSynthesis.applicabilityWarnings,
    ...bundle.routes.map((route) => route.tradeoff),
    ...bundle.routes.map((route) => route.unknownToVerify),
    ...bundle.assumptions.map((assumption) => assumption.whyItMatters)
  ].flatMap((claim) => claim.citations);
}

/**
 * Parse a model response only as a candidate and reject citations not present
 * in the reviewed retrieval set. This function never touches GameSession or
 * the deterministic rule engine.
 */
export function parseAiCandidateBundle(
  input: unknown,
  allowedSourceIds: Iterable<string>
): AiCandidateBundle {
  const candidate = AiCandidateBundleSchema.parse(input);
  const allowed = new Set(allowedSourceIds);
  const citations = [
    ...collectCitations(candidate),
    ...candidate.proposedActions.flatMap((action) => action.citations),
    ...candidate.experiment.steps.flatMap((step) => step.citations)
  ];

  for (const citation of citations) {
    if (!allowed.has(citation.sourceId)) {
      throw new Error(
        `AI candidate referenced unavailable source: ${citation.sourceId}`
      );
    }
  }

  return candidate;
}
