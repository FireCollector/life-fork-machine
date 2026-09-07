import { createHash } from "node:crypto";

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
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RATE_LIMIT = 10;
const DEFAULT_CACHE_TTL_MS = 5 * 60_000;
const DEFAULT_CACHE_MAX_ENTRIES = 100;
const PROMPT_VERSION = "task-030.v1";

export type AiGatewayConfig = {
  provider: "openai-responses" | "disabled";
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
  provider: "openai-responses" | null;
  model: string | null;
};

export type AiGatewayEvent = {
  requestId: string;
  durationMs: number;
  provider: "openai-responses" | "disabled";
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

export function readAiGatewayConfig(
  env: NodeJS.ProcessEnv = process.env
): AiGatewayConfig {
  const requestedProvider = env.AI_PROVIDER?.trim().toLowerCase();
  const apiKey = env.AI_API_KEY?.trim();
  const model = env.AI_MODEL?.trim();
  const provider =
    requestedProvider === "openai" && apiKey && model
      ? "openai-responses"
      : "disabled";

  return {
    provider,
    apiKey: provider === "openai-responses" ? apiKey : undefined,
    model: provider === "openai-responses" ? model : undefined,
    endpoint: env.AI_BASE_URL?.trim() || DEFAULT_ENDPOINT,
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
  if (config.provider !== "openai-responses" || !config.model) {
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
      "Return one JSON object only.",
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
    output?: Array<{ content?: Array<{ text?: unknown }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text;

  const text = response.output
    ?.flatMap((output) => output.content ?? [])
    .map((content) => content.text)
    .find((value): value is string => typeof value === "string");
  return text;
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
      config.provider !== "openai-responses" ||
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
            text: { format: { type: "json_object" } }
          })
        });
        const payload = (await response
          .json()
          .catch(() => undefined)) as unknown;
        const tokens = extractUsage(payload);

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
                failure: createFailure("provider-unavailable"),
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
              failure: createFailure("invalid-output"),
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
        } catch {
          return {
            result: {
              kind: "failure",
              failure: createFailure("invalid-output"),
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
          return {
            result: {
              kind: "failure",
              failure: createFailure("provider-unavailable")
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
