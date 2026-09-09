import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import {
  confirmDecisionBrief,
  createDecisionBrief,
  DecisionBriefSchema,
  type DecisionBrief
} from "@/features/decision-brief";
import {
  canonicalZhihuUrl,
  ZhihuLinkSchema
} from "@/features/zhihu-link-import";

const exec = promisify(execFile);
export const ZhihuEvidenceItemSchema = z
  .object({
    sourceId: z.string().regex(/^zh-[a-z0-9][a-z0-9-]*-\d{2}$/),
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
    items: z.array(ZhihuEvidenceItemSchema),
    message: z.string(),
    cached: z.boolean()
  })
  .strict();
export type ZhihuEvidenceResult = z.infer<typeof ZhihuEvidenceResultSchema>;
export type ZhihuEvidenceItem = z.infer<typeof ZhihuEvidenceItemSchema>;
const cache = new Map<
  string,
  { expires: number; result: ZhihuEvidenceResult }
>();

function sourceIdFor(contentId: string) {
  let hash = 2166136261;
  for (const character of contentId) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return `zh-retrieved-${(hash >>> 0).toString(36)}-01`;
}

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

async function searchZhihuQueries(
  queries: string[],
  cacheIdentity: string
): Promise<ZhihuEvidenceResult> {
  const key = createHash("sha256").update(cacheIdentity).digest("hex");
  const hit = cache.get(key);

  if (hit && hit.expires > Date.now()) return { ...hit.result, cached: true };
  const cli = getZhihuCliPath();
  const byId = new Map<string, ZhihuEvidenceItem>();

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
        const item = ZhihuEvidenceItemSchema.parse({
          sourceId: sourceIdFor(id),
          contentId: id,
          title: raw.Title || "未命名内容",
          url: raw.Url,
          author: raw.AuthorName || "知乎用户",
          excerpt:
            String(raw.ContentText || "").slice(0, 600) ||
            "检索结果未提供可整理摘要。",
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

export async function searchZhihuEvidence(
  input: unknown
): Promise<ZhihuEvidenceResult> {
  const brief = DecisionBriefSchema.parse(input);
  return searchZhihuQueries(deriveZhihuQueries(brief), JSON.stringify(brief));
}

export const ZhihuLinkImportResultSchema = z
  .object({
    status: z.enum(["ready", "empty", "unavailable", "rate-limited"]),
    message: z.string(),
    authorization: z.literal(
      "仅查询知乎公开检索结果；不读取账号私信、收藏、关注或任何私有内容。"
    ),
    link: ZhihuLinkSchema,
    match: z.enum(["exact", "related", "none"]),
    brief: DecisionBriefSchema.optional(),
    items: z.array(ZhihuEvidenceItemSchema),
    cached: z.boolean()
  })
  .strict();
export type ZhihuLinkImportResult = z.infer<typeof ZhihuLinkImportResultSchema>;

/**
 * The official public-search API does not expose an unrestricted "read this
 * URL" endpoint. We search its public index by the canonical link and content
 * ID, then label whether the returned source is the supplied link or merely a
 * related public discussion. That distinction is intentionally visible to the
 * person using the product.
 */
export async function importZhihuLink(
  input: unknown
): Promise<ZhihuLinkImportResult> {
  const parsed = z
    .object({
      link: ZhihuLinkSchema,
      focus: z.string().trim().min(4).max(240).optional()
    })
    .strict()
    .parse(input);
  const queries = [parsed.link.url, parsed.link.contentId, parsed.focus]
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);
  const result = await searchZhihuQueries(
    queries,
    `link:${parsed.link.url}:${parsed.focus ?? ""}`
  );
  const exact = result.items.find(
    (item) => canonicalZhihuUrl(item.url) === parsed.link.url
  );
  const subject = parsed.focus ?? exact?.title ?? result.items[0]?.title;
  const brief: DecisionBrief | undefined = subject
    ? confirmDecisionBrief(createDecisionBrief(subject))
    : undefined;
  const match = exact ? "exact" : result.items.length ? "related" : "none";
  const message =
    result.status !== "ready"
      ? result.message
      : match === "exact"
        ? "已找到该公开链接，并补齐可审核的相关观点。"
        : "官方公开检索没有返回该链接本身；下面是相关候选，需确认后再带入推演。";
  return ZhihuLinkImportResultSchema.parse({
    ...result,
    message,
    authorization:
      "仅查询知乎公开检索结果；不读取账号私信、收藏、关注或任何私有内容。",
    link: parsed.link,
    match,
    brief
  });
}
