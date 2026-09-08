import { createHash } from "node:crypto";
import { ZodError, toJSONSchema } from "zod";

import {
  AiCandidateBundleSchema,
  AiGenerationRequestSchema,
  type AiCandidateBundle,
  type AiFailure,
  type AiFailureCode,
  type AiGenerationRequest,
  type AiGenerationResult,
  parseAiCandidateBundle
} from "@/features/ai";

const DEFAULT_ENDPOINT = "https://api.openai.com/v1/responses";
const DEEPSEEK_RESPONSES_ENDPOINT = "https://api.deepseek.com/responses";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RATE_LIMIT = 10;
const DEFAULT_CACHE_TTL_MS = 5 * 60_000;
const DEFAULT_CACHE_MAX_ENTRIES = 100;
const PROMPT_VERSION = "task-030.v1";
const CandidateResponseSchema = toJSONSchema(AiCandidateBundleSchema, {
  target: "draft-7"
});

export type AiGatewayConfig = {
  provider: "openai-responses" | "deepseek-responses" | "disabled";
  apiKey?: string;
  model?: string;
  endpoint: string;
  timeoutMs: number;
  maxRetries: number;
  rateLimitPerMinute: number;
  cacheTtlMs: number;
  cacheMaxEntries: number;
  promptVersion: string;
};

export type AiGatewayStatus = {
  mode: "realtime-ready" | "demo-cache";
  provider: "openai-responses" | "deepseek-responses" | null;
  model: string | null;
};

export type AiGatewayEvent = {
  requestId: string;
  durationMs: number;
  provider: "openai-responses" | "deepseek-responses" | "disabled";
  model: string | null;
  promptVersion: string;
  attempts: number;
  cached: boolean;
  outcome: "candidate" | "failure";
  failureCode?: AiFailureCode;
  tokens?: {
    input?: number;
    output?: number;
    total?: number;
  };
};

type GatewayOptions = {
  callerKey?: string;
  signal?: AbortSignal;
};

type GatewayDependencies = {
  config: AiGatewayConfig;
  fetchImpl?: typeof fetch;
  now?: () => number;
  eventSink?: (event: AiGatewayEvent) => void;
};

type CachedCandidate = {
  expiresAt: number;
  candidate: AiCandidateBundle;
};

type TokenUsage = AiGatewayEvent["tokens"];

type ProviderCallResult =
  | { kind: "success"; candidate: AiCandidateBundle; tokens?: TokenUsage }
  | { kind: "failure"; failure: AiFailure; tokens?: TokenUsage };

function boundedNumber(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, Math.floor(parsed)))
    : fallback;
}

function responsesEndpoint(provider: AiGatewayConfig["provider"], value?: string) {
  const configured = value?.trim().replace(/\/$/, "");
  if (!configured) {
    return provider === "deepseek-responses"
      ? DEEPSEEK_RESPONSES_ENDPOINT
      : DEFAULT_ENDPOINT;
  }
  return configured.endsWith("/responses")
    ? configured
    : `${configured}/responses`;
}

export function readAiGatewayConfig(
  env: NodeJS.ProcessEnv = process.env
): AiGatewayConfig {
  const requestedProvider = env.AI_PROVIDER?.trim().toLowerCase();
  const apiKey = env.AI_API_KEY?.trim();
  const model = env.AI_MODEL?.trim();
  const provider =
    (requestedProvider === "openai" || requestedProvider === "deepseek") &&
    apiKey &&
    model
      ? requestedProvider === "deepseek"
        ? "deepseek-responses"
        : "openai-responses"
      : "disabled";

  return {
    provider,
    apiKey: provider !== "disabled" ? apiKey : undefined,
    model: provider !== "disabled" ? model : undefined,
    endpoint: responsesEndpoint(provider, env.AI_BASE_URL),
    timeoutMs: boundedNumber(
      env.AI_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      1_000,
      60_000
    ),
    maxRetries: boundedNumber(env.AI_MAX_RETRIES, 1, 0, 2),
    rateLimitPerMinute: boundedNumber(
      env.AI_RATE_LIMIT_PER_MINUTE,
      DEFAULT_RATE_LIMIT,
      1,
      60
    ),
    cacheTtlMs: boundedNumber(
      env.AI_CACHE_TTL_MS,
      DEFAULT_CACHE_TTL_MS,
      1_000,
      3_600_000
    ),
    cacheMaxEntries: boundedNumber(
      env.AI_CACHE_MAX_ENTRIES,
      DEFAULT_CACHE_MAX_ENTRIES,
      1,
      500
    ),
    promptVersion: env.AI_PROMPT_VERSION?.trim() || PROMPT_VERSION
  };
}

export function getAiGatewayStatus(config: AiGatewayConfig): AiGatewayStatus {
  if (config.provider === "disabled" || !config.model) {
    return { mode: "demo-cache", provider: null, model: null };
  }

  return {
    mode: "realtime-ready",
    provider: config.provider,
    model: config.model
  };
}

function createFailure(
  code: AiFailureCode,
  overrides: Partial<
    Omit<AiFailure, "contractVersion" | "provenance" | "code">
  > = {}
): AiFailure {
  const presets: Record<
    AiFailureCode,
    Omit<AiFailure, "contractVersion" | "provenance" | "code">
  > = {
    timeout: {
      retryable: true,
      userMessage: "生成超时，未保存任何候选内容。",
      fallback: "deterministic-demo",
      diagnostic: "provider request timed out"
    },
    cancelled: {
      retryable: false,
      userMessage: "本次生成已停止，未保存任何候选内容。",
      fallback: "stop",
      diagnostic: "request was cancelled"
    },
    "rate-limited": {
      retryable: true,
      userMessage: "请求过于频繁，请稍后再试。",
      fallback: "deterministic-demo",
      diagnostic: "gateway rate limit reached"
    },
    "provider-unavailable": {
      retryable: true,
      userMessage: "实时 AI 暂不可用，已保留演示缓存入口。",
      fallback: "deterministic-demo",
      diagnostic: "provider is unavailable or credentials are missing"
    },
    "invalid-output": {
      retryable: false,
      userMessage: "生成结果没有通过结构校验，请改用演示缓存或稍后重试。",
      fallback: "manual-review",
      diagnostic: "provider response did not match the candidate contract"
    },
    "insufficient-evidence": {
      retryable: false,
      userMessage: "现有来源不足，先补充可追溯资料。",
      fallback: "manual-review",
      diagnostic: "request does not have enough reviewed evidence"
    },
    "citation-conflict": {
      retryable: false,
      userMessage: "来源条件存在冲突，不能直接合并成结论。",
      fallback: "manual-review",
      diagnostic: "candidate cited unavailable or conflicting evidence"
    },
    "sensitive-topic": {
      retryable: false,
      userMessage: "这个议题不适合用普通人生推演处理。",
      fallback: "stop",
      diagnostic: "sensitive-topic guard triggered"
    },
    "policy-refusal": {
      retryable: false,
      userMessage: "无法按这个请求生成候选内容。",
      fallback: "stop",
      diagnostic: "provider refused the request"
    }
  };

  return {
    contractVersion: 1,
    provenance: "ai-failure",
    code,
    ...presets[code],
    ...overrides
  };
}

function isSensitiveTopic(question: string) {
  return /自杀|自伤|伤害自己|急诊|诊断|处方|诉讼|犯罪|报案|投资建议|荐股|借贷/.test(
    question
  );
}

function cacheKey(request: AiGenerationRequest) {
  const cacheableRequest = {
    contractVersion: request.contractVersion,
    task: request.task,
    topic: request.topic,
    evidence: request.evidence,
    instruction: request.instruction
  };
  return createHash("sha256")
    .update(JSON.stringify(cacheableRequest))
    .digest("hex");
}

function userPrompt(request: AiGenerationRequest) {
  return JSON.stringify({
    request,
    responseRules: [
      "Return one JSON object only. The response must conform to the supplied JSON Schema.",
      "Use only source IDs from request.evidence.",
      "Every externally grounded claim needs citations and uncertainty.",
      "Return review.status as needs-evidence-review, needs-editor-review, or blocked.",
      "Do not include state, stateDelta, GameSession, publishing decisions, scores, success rates, or future predictions.",
      "Use Chinese for user-visible fields.",
      "Set contractVersion to 1 and provenance to ai-generated-candidate."
    ]
  });
}

function extractText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const response = payload as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{ type?: unknown; text?: unknown }>;
    }>;
  };
  if (typeof response.output_text === "string") return response.output_text;

  const parts = response.output?.flatMap((output) => output.content ?? []) ?? [];
  const typedText = parts
    .filter((content) => content.type === "output_text")
    .map((content) => content.text)
    .find((value): value is string => typeof value === "string");
  if (typedText) return typedText;

  return parts
    .map((content) => content.text)
    .find((value): value is string => typeof value === "string");
}

function outputShape(payload: unknown) {
  if (!payload || typeof payload !== "object") return "non-object response";
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "no output array";
  return output
    .slice(0, 4)
    .map((item) => {
      if (!item || typeof item !== "object") return "unknown";
      const record = item as { type?: unknown; content?: unknown };
      const itemType = typeof record.type === "string" ? record.type : "unknown";
      const contentTypes = Array.isArray(record.content)
        ? record.content
            .slice(0, 4)
            .map((content) =>
              content && typeof content === "object" &&
              typeof (content as { type?: unknown }).type === "string"
                ? (content as { type: string }).type
                : "unknown"
            )
            .join(",")
        : "none";
      return `${itemType}(${contentTypes})`;
    })
    .join(";");
}

function extractUsage(payload: unknown): TokenUsage | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const usage = (payload as { usage?: Record<string, unknown> }).usage;
  if (!usage) return undefined;
  const number = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined;
  const input = number(usage.input_tokens ?? usage.prompt_tokens);
  const output = number(usage.output_tokens ?? usage.completion_tokens);
  const total = number(usage.total_tokens);
  return input === undefined && output === undefined && total === undefined
    ? undefined
    : { input, output, total };
}

function candidateValidationDiagnostic(error: unknown) {
  if (error instanceof ZodError) {
    const paths = error.issues
      .slice(0, 3)
      .map((issue) => issue.path.join(".") || "root")
      .join(", ");
    return `candidate schema mismatch at ${paths || "root"}`;
  }
  return error instanceof Error && error.message.startsWith("AI candidate")
    ? "candidate cited an unavailable source"
    : "candidate did not pass contract validation";
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function callerBucketKey(value: string | undefined) {
  return createHash("sha256")
    .update(value || "anonymous")
    .digest("hex");
}

export function createAiGateway({
  config,
  fetchImpl = fetch,
  now = () => Date.now(),
  eventSink = (event) =>
    console.info(JSON.stringify({ event: "ai_gateway", ...event }))
}: GatewayDependencies) {
  const cache = new Map<string, CachedCandidate>();
  const rateWindows = new Map<string, number[]>();

  function emit(
    request: AiGenerationRequest,
    startedAt: number,
    result: AiGenerationResult,
    options: { attempts: number; cached: boolean; tokens?: TokenUsage }
  ) {
    eventSink({
      requestId: request.requestId,
      durationMs: Math.max(0, now() - startedAt),
      provider: config.provider,
      model: config.model ?? null,
      promptVersion: config.promptVersion,
      attempts: options.attempts,
      cached: options.cached,
      outcome:
        result.provenance === "ai-generated-candidate"
          ? "candidate"
          : "failure",
      failureCode: result.provenance === "ai-failure" ? result.code : undefined,
      tokens: options.tokens
    });
  }

  function isRateLimited(callerKey: string, timestamp: number) {
    const windowStart = timestamp - 60_000;
    const existing = (rateWindows.get(callerKey) ?? []).filter(
      (entry) => entry > windowStart
    );
    if (existing.length >= config.rateLimitPerMinute) {
      rateWindows.set(callerKey, existing);
      return true;
    }
    existing.push(timestamp);
    rateWindows.set(callerKey, existing);
    return false;
  }

  function storeCachedCandidate(key: string, candidate: AiCandidateBundle) {
    cache.set(key, { expiresAt: now() + config.cacheTtlMs, candidate });
    while (cache.size > config.cacheMaxEntries) {
      const oldest = cache.keys().next().value;
      if (!oldest) break;
      cache.delete(oldest);
    }
  }

  async function callProvider(
    request: AiGenerationRequest,
    signal?: AbortSignal
  ): Promise<{ result: ProviderCallResult; attempts: number }> {
    if (
      config.provider === "disabled" ||
      !config.apiKey ||
      !config.model
    ) {
      return {
        result: {
          kind: "failure",
          failure: createFailure("provider-unavailable")
        },
        attempts: 0
      };
    }

    for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
      let timedOut = false;
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, config.timeoutMs);
      const cancel = () => controller.abort();
      signal?.addEventListener("abort", cancel, { once: true });

      try {
        const response = await fetchImpl(config.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json"
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: config.model,
            input: [
              {
                role: "system",
                content:
                  "You generate reviewable decision candidates. Follow the supplied JSON rules exactly."
              },
              { role: "user", content: userPrompt(request) }
            ],
            max_output_tokens: 3_500,
            text: {
              format: {
                type: "json_schema",
                name: "reviewable_life_fork_candidate",
                schema: CandidateResponseSchema
              }
            }
          })
        });
        const rawPayload = await response.text();
        const payload = (() => {
          try {
            return JSON.parse(rawPayload) as unknown;
          } catch {
            return undefined;
          }
        })();
        const tokens = extractUsage(payload);
        const responseShape = payload
          ? outputShape(payload)
          : `non-JSON HTTP ${response.status} (${response.headers.get("content-type") ?? "no content type"})`;

        if (!response.ok) {
          if (response.status === 429) {
            return {
              result: {
                kind: "failure",
                failure: createFailure("rate-limited"),
                tokens
              },
              attempts: attempt + 1
            };
          }
          if (response.status === 400 || response.status === 403) {
            return {
              result: {
                kind: "failure",
                failure: createFailure("policy-refusal"),
                tokens
              },
              attempts: attempt + 1
            };
          }
          if (response.status < 500 || attempt === config.maxRetries) {
            return {
              result: {
                kind: "failure",
                failure: createFailure("provider-unavailable", {
                  diagnostic: `provider returned HTTP ${response.status}`
                }),
                tokens
              },
              attempts: attempt + 1
            };
          }
          continue;
        }

        const text = extractText(payload);
        if (!text) {
          return {
            result: {
              kind: "failure",
              failure: createFailure("invalid-output", {
                diagnostic: `provider response had no usable output text: ${responseShape}`
              }),
              tokens
            },
            attempts: attempt + 1
          };
        }

        try {
          const parsed = parseAiCandidateBundle(
            JSON.parse(text),
            request.evidence.map((source) => source.id)
          );
          const candidate = AiCandidateBundleSchema.parse({
            ...parsed,
            metadata: {
              provider: config.provider,
              model: config.model,
              generatedAt: new Date(now()).toISOString(),
              promptVersion: config.promptVersion
            }
          });
          return {
            result: { kind: "success", candidate, tokens },
            attempts: attempt + 1
          };
        } catch (error) {
          return {
            result: {
              kind: "failure",
              failure: createFailure("invalid-output", {
                diagnostic: candidateValidationDiagnostic(error)
              }),
              tokens
            },
            attempts: attempt + 1
          };
        }
      } catch (error) {
        if (timedOut) {
          return {
            result: { kind: "failure", failure: createFailure("timeout") },
            attempts: attempt + 1
          };
        }
        if (signal?.aborted || isAbortError(error)) {
          return {
            result: { kind: "failure", failure: createFailure("cancelled") },
            attempts: attempt + 1
          };
        }
        if (attempt === config.maxRetries) {
          const errorName =
            error instanceof Error ? error.name : "UnknownError";
          return {
            result: {
              kind: "failure",
              failure: createFailure("provider-unavailable", {
                diagnostic: `provider request failed: ${errorName}`
              })
            },
            attempts: attempt + 1
          };
        }
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", cancel);
      }
    }

    return {
      result: {
        kind: "failure",
        failure: createFailure("provider-unavailable")
      },
      attempts: config.maxRetries + 1
    };
  }

  return {
    status: () => getAiGatewayStatus(config),
    async generate(
      input: unknown,
      options: GatewayOptions = {}
    ): Promise<AiGenerationResult> {
      const startedAt = now();
      const parsedRequest = AiGenerationRequestSchema.safeParse(input);
      if (!parsedRequest.success) {
        return createFailure("invalid-output", {
          userMessage: "请求格式不完整，未向 AI 服务发送内容。",
          fallback: "ask-user",
          diagnostic: "request did not match AiGenerationRequest"
        });
      }
      const request = parsedRequest.data;

      if (isSensitiveTopic(request.topic.rawQuestion)) {
        const failure = createFailure("sensitive-topic");
        emit(request, startedAt, failure, { attempts: 0, cached: false });
        return failure;
      }

      const key = cacheKey(request);
      const cached = cache.get(key);
      if (cached && cached.expiresAt > now()) {
        emit(request, startedAt, cached.candidate, {
          attempts: 0,
          cached: true
        });
        return cached.candidate;
      }
      cache.delete(key);

      if (isRateLimited(callerBucketKey(options.callerKey), now())) {
        const failure = createFailure("rate-limited");
        emit(request, startedAt, failure, { attempts: 0, cached: false });
        return failure;
      }

      const providerCall = await callProvider(request, options.signal);
      const result =
        providerCall.result.kind === "success"
          ? providerCall.result.candidate
          : providerCall.result.failure;
      if (providerCall.result.kind === "success") {
        storeCachedCandidate(key, providerCall.result.candidate);
      }
      emit(request, startedAt, result, {
        attempts: providerCall.attempts,
        cached: false,
        tokens: providerCall.result.tokens
      });
      return result;
    }
  };
}

const defaultGateway = createAiGateway({ config: readAiGatewayConfig() });

export const aiGateway = defaultGateway;
