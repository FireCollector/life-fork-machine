import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { type AiFailure } from "@/features/ai";
import {
  createEvidenceOrganizationRequest,
  EvidenceSourceSchema,
  organizationFromAiCandidate,
  organizationFromSourceRules
} from "@/features/evidence";
import { DecisionBriefSchema } from "@/features/decision-brief";
import { aiGateway } from "@/server/ai";
import { ZhihuEvidenceItemSchema } from "@/server/evidence/zhihu-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    brief: DecisionBriefSchema,
    evidence: z.object({
      status: z.literal("ready"),
      items: z.array(ZhihuEvidenceItemSchema).min(3).max(12)
    })
  })
  .strict();

function organizationRequestId(briefId: string, sourceIds: string[]) {
  const fingerprint = createHash("sha256")
    .update(`${briefId}:${sourceIds.join(",")}`)
    .digest("hex")
    .slice(0, 16);
  return `evidence-${fingerprint}`;
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(
    await request.json().catch(() => undefined)
  );
  if (!parsed.success) {
    return response(
      { message: "请先提供至少 3 条可追溯的知乎候选内容。" },
      400
    );
  }
  if (
    !parsed.data.brief.confirmed ||
    parsed.data.brief.safety.status === "stop"
  ) {
    return response(
      { message: "请先确认一份适合进入证据整理的决策简报。" },
      422
    );
  }

  const sources = parsed.data.evidence.items.map((item) =>
    EvidenceSourceSchema.parse(item)
  );
  const result = await aiGateway.generate(
    createEvidenceOrganizationRequest(
      parsed.data.brief,
      sources,
      organizationRequestId(
        parsed.data.brief.id,
        sources.map((source) => source.sourceId)
      )
    ),
    { signal: request.signal }
  );

  if (result.provenance === "ai-failure") {
    const failure = result as AiFailure;
    return response({
      ...organizationFromSourceRules(parsed.data.brief, sources),
      fallbackNotice: `实时 AI 整理未完成：${failure.userMessage} 当前展示的是本次来源的规则辅助整理。`
    });
  }

  return response(
    organizationFromAiCandidate(parsed.data.brief, sources, result)
  );
}
