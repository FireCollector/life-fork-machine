import { describe, expect, it, vi } from "vitest";

import { createAiGateway, readAiGatewayConfig } from "@/server/ai";

const sourceIds = [
  "zh-career-bridge-01",
  "zh-career-bridge-02",
  "zh-career-bridge-03"
];

function request() {
  return {
    contractVersion: 1,
    requestId: "gateway-request-001",
    task: "propose-next-steps",
    topic: {
      rawQuestion: "稳定高薪工作与跟领导创业如何选择？",
      locale: "zh-CN",
      confirmedConstraints: [{ category: "cash", text: "我需要保留家庭现金流" }]
    },
    evidence: sourceIds.map((id, index) => ({
      id,
      title: `来源 ${index + 1}`,
      author: `作者 ${index + 1}`,
      claim: "社区经验提示这条路径需要先把条件和风险写清楚。",
      conditions: ["处境不同，不能直接照搬"],
      stance: index === 1 ? "oppose" : "conditional",
      url: `https://www.zhihu.com/question/${1000 + index}`
    })),
    instruction:
      "Return a reviewable candidate. Do not predict outcomes, recommend a best route, or mutate game state."
  } as const;
}

function claim(text: string, sourceId = sourceIds[0]) {
  return {
    text,
    citations: [{ sourceId, use: "claim" }],
    confidence: "medium",
    uncertainty: "来源描述的是他人的处境，仍需核对你的条件。"
  };
}

function candidate() {
  return {
    contractVersion: 1,
    provenance: "ai-generated-candidate",
    metadata: {
      provider: "untrusted-model-value",
      model: "untrusted-model-value",
      generatedAt: "2026-09-01T00:00:00.000Z",
      promptVersion: "untrusted"
    },
    topic: {
      normalizedQuestion: "稳定高薪工作与跟领导创业如何选择？",
      scope: "career",
      tension:
        "你需要同时比较现金流、成长机会和承诺是否兑现，而不是只问哪条路更好。",
      acknowledgedConstraints: ["需要保留家庭现金流"],
      missingInformation: ["股权、职责和退出条件是否能写入可核验材料"]
    },
    evidenceSynthesis: {
      agreements: [claim("多条经验都强调先核对书面条件。")],
      disagreements: [
        claim("不同回答对风险承受程度的判断不同。", sourceIds[1])
      ],
      applicabilityWarnings: [
        claim("他人的现金缓冲不等于你的现金缓冲。", sourceIds[2])
      ]
    },
    routes: [
      {
        id: "stay",
        label: "继续当前工作",
        tradeoff: claim("保住现金流，也可能延后尝试新机会。"),
        unknownToVerify: claim("当前岗位是否仍能带来目标成长。")
      },
      {
        id: "bridge",
        label: "先搭桥验证",
        tradeoff: claim("先花时间核验条件，再决定是否加码。"),
        unknownToVerify: claim("领导是否愿意提供可核验的职责和权益材料。")
      }
    ],
    assumptions: [
      {
        label: "权益承诺可以兑现",
        whyItMatters: claim("它会影响你承担风险的上限。"),
        checkQuestion: "能否在本周拿到职责、现金和权益的书面版本？"
      }
    ],
    proposedActions: [
      {
        label: "索取书面材料",
        purpose: "把口头承诺变成可核验事实。",
        evidenceArtifact: "职责、现金和权益条款清单。",
        timeBudget: "90 分钟",
        moneyBudget: "0 元",
        exitRule: "对方无法提供核心材料时，不进入不可逆承诺。",
        citations: [{ sourceId: sourceIds[0], use: "condition" }]
      }
    ],
    experiment: {
      title: "七天条件核验",
      keyQuestion: "这份邀请的核心条件能否被外部材料证实？",
      steps: [
        {
          label: "列出未知",
          purpose: "区分已经知道和仍需核验的条件。",
          evidenceArtifact: "未知清单。",
          timeBudget: "30 分钟",
          moneyBudget: "0 元",
          exitRule: "未知超过三项时，先不作最终决定。",
          citations: [{ sourceId: sourceIds[0], use: "condition" }]
        }
      ],
      resultInterpretation: {
        supported: "关键条件已被材料支持，可以带着新事实继续比较。",
        contradicted: "关键条件未被支持，应重新评估承诺上限。",
        inconclusive: "材料不足，先设定补充材料的截止日期。"
      },
      reminder: "这是实验建议，不是已执行的事实。"
    },
    explanation: {
      whatThisCanDo: "把来源中的分歧整理成可核验的问题和行动。",
      whatThisCannotDo: "不能预测结果、给出最佳路线或替你做决定。",
      nextReviewStep: "需要证据审核和人工确认后，才能进入正式推演。"
    },
    review: {
      status: "needs-evidence-review",
      reasons: ["需要确认每条引用是否贴合当前用户的处境。"]
    }
  };
}

function config(
  overrides: Partial<ReturnType<typeof readAiGatewayConfig>> = {}
) {
  return {
    provider: "openai-responses" as const,
    apiKey: "test-secret-never-log",
    model: "test-model",
    endpoint: "https://provider.test/v1/responses",
    timeoutMs: 50,
    maxRetries: 1,
    rateLimitPerMinute: 3,
    cacheTtlMs: 60_000,
    cacheMaxEntries: 10,
    promptVersion: "task-030.test",
    ...overrides
  };
}

function successResponse(body = candidate()) {
  return new Response(
    JSON.stringify({
      output_text: JSON.stringify(body),
      usage: { input_tokens: 120, output_tokens: 80, total_tokens: 200 }
    }),
    { status: 200 }
  );
}

describe("TASK-030 server AI gateway", () => {
  it("uses only configured server credentials and overwrites model-controlled metadata", async () => {
    const events: unknown[] = [];
    let lastInit: RequestInit | undefined;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        lastInit = init;
        return successResponse();
      }
    );
    const fetchImpl = fetchMock as unknown as typeof fetch;
    const gateway = createAiGateway({
      config: config(),
      fetchImpl,
      now: () => Date.parse("2026-09-07T15:40:00.000Z"),
      eventSink: (event) => events.push(event)
    });

    const result = await gateway.generate(request());

    expect(result).toMatchObject({
      provenance: "ai-generated-candidate",
      metadata: {
        provider: "openai-responses",
        model: "test-model",
        promptVersion: "task-030.test"
      }
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(lastInit).toMatchObject({
      headers: expect.objectContaining({
        Authorization: "Bearer test-secret-never-log"
      })
    });
    expect(JSON.parse(String(lastInit?.body))).toMatchObject({
      reasoning: { effort: "none" },
      temperature: 0,
      max_output_tokens: 3500,
      text: {
        format: {
          type: "json_schema",
          name: "reviewable_life_fork_candidate"
        }
      }
    });
    expect(JSON.stringify(events)).not.toContain("test-secret-never-log");
    expect(JSON.stringify(events)).not.toContain("稳定高薪");
    expect(events).toEqual([
      expect.objectContaining({
        requestId: "gateway-request-001",
        cached: false,
        attempts: 1,
        tokens: { input: 120, output: 80, total: 200 }
      })
    ]);
  });

  it("uses an in-memory cache before consuming another provider call", async () => {
    const fetchImpl = vi.fn(async () =>
      successResponse()
    ) as unknown as typeof fetch;
    const gateway = createAiGateway({
      config: config(),
      fetchImpl,
      eventSink: () => undefined
    });

    await gateway.generate(request());
    await gateway.generate({ ...request(), requestId: "gateway-request-002" });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps a timed-out request to a safe fallback", async () => {
    const fetchImpl = vi.fn(
      (
        _input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1]
      ) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    ) as unknown as typeof fetch;
    const gateway = createAiGateway({
      config: config({ timeoutMs: 5 }),
      fetchImpl,
      eventSink: () => undefined
    });

    const result = await gateway.generate(request());
    expect(result).toMatchObject({ provenance: "ai-failure", code: "timeout" });
  });

  it("rejects malformed provider output without mutating the candidate contract", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ output_text: "{not valid json" }), {
          status: 200
        })
    ) as unknown as typeof fetch;
    const gateway = createAiGateway({
      config: config(),
      fetchImpl,
      eventSink: () => undefined
    });

    const result = await gateway.generate(request());
    expect(result).toMatchObject({
      provenance: "ai-failure",
      code: "invalid-output",
      diagnostic: expect.stringContaining("provider output was not parseable JSON")
    });
  });

  it("recovers one embedded JSON object before applying the candidate contract", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            output_text: `Model preamble.\n${JSON.stringify(candidate())}`
          }),
          { status: 200 }
        )
    ) as unknown as typeof fetch;
    const gateway = createAiGateway({
      config: config(),
      fetchImpl,
      eventSink: () => undefined
    });

    await expect(gateway.generate(request())).resolves.toMatchObject({
      provenance: "ai-generated-candidate"
    });
  });

  it("keeps the app on demo cache when credentials are not configured", async () => {
    const gateway = createAiGateway({
      config: config({
        provider: "disabled",
        apiKey: undefined,
        model: undefined
      }),
      fetchImpl: vi.fn() as unknown as typeof fetch,
      eventSink: () => undefined
    });

    const result = await gateway.generate(request());
    expect(gateway.status()).toEqual({
      mode: "demo-cache",
      provider: null,
      model: null
    });
    expect(result).toMatchObject({
      provenance: "ai-failure",
      code: "provider-unavailable",
      fallback: "deterministic-demo"
    });
  });

  it("parses absent credentials as a disabled server configuration", () => {
    expect(
      readAiGatewayConfig({
        AI_PROVIDER: "openai"
      } as unknown as NodeJS.ProcessEnv).provider
    ).toBe("disabled");
  });

  it("maps a DeepSeek base URL to its Responses endpoint", () => {
    const parsed = readAiGatewayConfig({
      AI_PROVIDER: "deepseek",
      AI_API_KEY: "test-secret-never-log",
      AI_MODEL: "deepseek-v4-flash",
      AI_BASE_URL: "https://api.deepseek.com"
    } as unknown as NodeJS.ProcessEnv);

    expect(parsed).toMatchObject({
      provider: "deepseek-responses",
      endpoint: "https://api.deepseek.com/responses",
      model: "deepseek-v4-flash"
    });
  });
});
