import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { type AiFailure } from "@/features/ai";
import { DecisionBriefSchema } from "@/features/decision-brief";
import {
  createEvidenceOrganizationRequest,
  EvidenceSourceSchema
} from "@/features/evidence";
import {
  candidateFromAi,
  candidateFromRules,
  validateCandidateScenario
} from "@/features/scenario-candidate";
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

function requestId(briefId: string, sourceIds: string[]) {
  return `scenario-${createHash("sha256")
    .update(`${briefId}:${sourceIds.join(",")}`)
    .digest("hex")
    .slice(0, 16)}`;
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
  const parsed = BodySchema.safeParse(
    await request.json().catch(() => undefined)
  );
  if (!parsed.success)
    return json({ message: "需要至少 3 条本次检索到的可追溯来源。" }, 400);
  if (
    !parsed.data.brief.confirmed ||
    parsed.data.brief.safety.status === "stop"
  )
    return json({ message: "请先确认可以进入情景草稿的决策简报。" }, 422);

  const sources = parsed.data.evidence.items.map((item) =>
    EvidenceSourceSchema.parse(item)
  );
  const aiRequest = createEvidenceOrganizationRequest(
    parsed.data.brief,
    sources,
    requestId(
      parsed.data.brief.id,
      sources.map((source) => source.sourceId)
    )
  );
  const result = await aiGateway.generate(
    { ...aiRequest, task: "propose-next-steps" },
    { signal: request.signal }
  );
  const pack =
    result.provenance === "ai-generated-candidate"
      ? candidateFromAi(parsed.data.brief, sources, result)
      : candidateFromRules(parsed.data.brief, sources);

  return json({
    pack,
    validation: validateCandidateScenario(pack),
    notice:
      result.provenance === "ai-failure"
        ? `实时 AI 候选未通过：${(result as AiFailure).userMessage} 当前展示规则辅助草稿。`
        : "AI 候选已通过结构和引用校验，仍需人工审核后才能发布。"
  });
}
