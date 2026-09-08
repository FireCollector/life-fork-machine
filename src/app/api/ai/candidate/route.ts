import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { AiGenerationRequestSchema, type AiFailure } from "@/features/ai";
import { aiGateway } from "@/server/ai/gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 128_000;

function anonymizeCaller(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const source = forwarded || request.headers.get("x-real-ip") || "anonymous";
  return createHash("sha256").update(source).digest("hex");
}

function responseStatus(failure: AiFailure) {
  if (failure.code === "rate-limited") return 429;
  if (failure.code === "timeout") return 504;
  if (failure.code === "provider-unavailable") return 503;
  if (failure.code === "invalid-output") return 400;
  if (failure.code === "sensitive-topic" || failure.code === "policy-refusal") {
    return 422;
  }
  return 200;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return json(
      {
        contractVersion: 1,
        provenance: "ai-failure",
        code: "invalid-output",
        retryable: false,
        userMessage: "请求内容过大，未向 AI 服务发送内容。",
        fallback: "ask-user",
        diagnostic: "request body exceeds gateway limit"
      },
      413
    );
  }

  const raw = await request.json().catch(() => undefined);
  const parsed = AiGenerationRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      {
        contractVersion: 1,
        provenance: "ai-failure",
        code: "invalid-output",
        retryable: false,
        userMessage: "请求格式不完整，未向 AI 服务发送内容。",
        fallback: "ask-user",
        diagnostic: "request did not match AiGenerationRequest"
      },
      400
    );
  }

  const result = await aiGateway.generate(parsed.data, {
    callerKey: anonymizeCaller(request),
    signal: request.signal
  });
  return json(
    result,
    result.provenance === "ai-failure" ? responseStatus(result) : 200
  );
}
