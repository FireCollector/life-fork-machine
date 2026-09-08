import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { DecisionBriefSchema } from "@/features/decision-brief";

const exec = promisify(execFile);
const Item = z
  .object({
    contentId: z.string().min(1),
    title: z.string().min(1),
    url: z.string().url(),
    author: z.string(),
    excerpt: z.string(),
    voteUpCount: z.number(),
    rankingScore: z.number(),
    retrievedAt: z.string().datetime(),
    queries: z.array(z.string()).min(1)
  })
  .strict();
export const ZhihuEvidenceResultSchema = z
  .object({
    status: z.enum(["ready", "empty", "unavailable", "rate-limited"]),
    items: z.array(Item),
    message: z.string(),
    cached: z.boolean()
  })
  .strict();
export type ZhihuEvidenceResult = z.infer<typeof ZhihuEvidenceResultSchema>;
const cache = new Map<
  string,
  { expires: number; result: ZhihuEvidenceResult }
>();

export function deriveZhihuQueries(brief: z.infer<typeof DecisionBriefSchema>) {
  const choiceQuery = `${brief.options.join(" 或 ")} 怎么选`;
  const evidenceTerms = [
    ...brief.constraints.map((item) => item.text),
    ...brief.unknowns
  ].join(" ");
  const queries = [brief.normalizedQuestion, choiceQuery];

  if (evidenceTerms) {
    queries.push(`${brief.options.join(" ")} ${evidenceTerms}`);
  }

  return [
    ...new Set(
      queries.map((query) => query.replace(/[？?]/g, "").trim()).filter(Boolean)
    )
  ].slice(0, 4);
}

function getZhihuCliPath() {
  if (process.env.ZHIHU_CLI_PATH) return process.env.ZHIHU_CLI_PATH;
  if (process.platform !== "win32" || !process.env.LOCALAPPDATA)
    return "zhihu-cli";
  return join(process.env.LOCALAPPDATA, "ZhihuCLI", "current", "zhihu-cli.exe");
}

export async function searchZhihuEvidence(
  input: unknown
): Promise<ZhihuEvidenceResult> {
  const brief = DecisionBriefSchema.parse(input);
  const key = createHash("sha256").update(JSON.stringify(brief)).digest("hex");
  const hit = cache.get(key);

  if (hit && hit.expires > Date.now()) return { ...hit.result, cached: true };
  const cli = getZhihuCliPath();
  const queries = deriveZhihuQueries(brief);
  const byId = new Map<string, z.infer<typeof Item>>();

  try {
    for (const query of queries) {
      const { stdout } = await exec(
        cli,
        ["search", "zhihu", "--query", query, "--count", "5"],
        {
          timeout: 15_000,
          maxBuffer: 1_000_000
        }
      );
      const response = JSON.parse(stdout);

      if (response.Code === 30001) {
        return {
          status: "rate-limited",
          items: [],
          message: "知乎检索额度或频率受限，请稍后再试。",
          cached: false
        };
      }

      for (const raw of response.Data?.Items ?? []) {
        const id = String(raw.ContentID ?? "");
        if (!id) continue;
        const existing = byId.get(id);
        if (existing) {
          if (!existing.queries.includes(query)) existing.queries.push(query);
          continue;
        }
        const item = Item.parse({
          contentId: id,
          title: raw.Title || "未命名内容",
          url: raw.Url,
          author: raw.AuthorName || "知乎用户",
          excerpt: String(raw.ContentText || "").slice(0, 600),
          voteUpCount: Number(raw.VoteUpCount || 0),
          rankingScore: Number(raw.RankingScore || 0),
          retrievedAt: new Date().toISOString(),
          queries: [query]
        });
        byId.set(id, item);
      }
    }
  } catch {
    return {
      status: "unavailable",
      items: [],
      message: "知乎检索暂不可用；不会用旧内容冒充实时结果。",
      cached: false
    };
  }

  const items = [...byId.values()].slice(0, 12);
  const result: ZhihuEvidenceResult = {
    status: items.length ? "ready" : "empty",
    items,
    message: items.length
      ? "已获取待审核的知乎经验候选，尚未形成结论。"
      : "没有找到可用候选，请调整问题或稍后再试。",
    cached: false
  };
  cache.set(key, { expires: Date.now() + 300_000, result });
  return result;
}
