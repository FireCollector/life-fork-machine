import { NextResponse } from "next/server";
import { z } from "zod";

import { type AiFailure } from "@/features/ai";
import { DecisionBriefSchema } from "@/features/decision-brief";
import {
  createDynamicNarrativeRequest,
  NarrativeContextInputSchema,
  narrativeFromAiCandidate,
  narrativeFromRules,
  validateNarrativeSnapshot
} from "@/features/dynamic-narrative";
import { EvidenceSourceSchema } from "@/features/evidence";
import { CandidateScenarioPackSchema } from "@/features/scenario-candidate";
import { aiGateway } from "@/server/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    brief: DecisionBriefSchema,
    evidence: z.object({
      status: z.literal("ready"),
      items: z.array(EvidenceSourceSchema).min(3).max(12)
    }),
    pack: CandidateScenarioPackSchema,
    context: NarrativeContextInputSchema
  })
  .strict();

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
    return json(
      { message: "动态叙事需要已确认的简报、候选剧本和至少 3 条来源。" },
      400
    );
  const { brief, evidence, pack, context } = parsed.data;
  if (!brief.confirmed || brief.safety.status === "stop")
    return json({ message: "请先确认可以进入候选推演的决策简报。" }, 422);
  if (pack.briefId !== brief.id)
    return json({ message: "这个候选剧本不属于当前议题，不能混用。" }, 409);

  const sources = evidence.items;
  const evidenceIds = new Set(sources.map((source) => source.sourceId));
  if (pack.sourceIds.some((sourceId) => !evidenceIds.has(sourceId)))
    return json({ message: "候选剧本引用的来源不在这次检索结果中。" }, 409);

  const result = await aiGateway.generate(
    createDynamicNarrativeRequest(brief, pack, context, sources),
    { signal: request.signal }
  );
  const snapshot =
    result.provenance === "ai-generated-candidate"
      ? narrativeFromAiCandidate(brief, pack, context, sources, result)
      : narrativeFromRules(brief, pack, context, sources);

  return json({
    snapshot,
    validation: validateNarrativeSnapshot(snapshot, pack),
    notice:
      result.provenance === "ai-failure"
        ? `实时 AI 没有生成可审核内容：${(result as AiFailure).userMessage} 已展示规则审核模板。`
        : "AI 只参与候选表达；来源、预算和发布状态仍由当前剧本与规则门禁控制。"
  });
}
