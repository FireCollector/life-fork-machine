import rawSnapshot from "../../../content/evidence/zhihu-search-latest.json";

import { SourceCardSchema, type SourceCard } from "./schema";

export interface ZhihuSearchItem {
  id: string;
  contentId: string;
  title: string;
  url: string;
  author: string;
  contentType: string;
  excerpt: string;
  voteUpCount: number;
  rankingScore: number;
}

export interface ZhihuSearchSnapshot {
  schemaVersion: 1;
  query: string;
  retrievedAt: string;
  source: "zhihu_open_platform";
  items: ZhihuSearchItem[];
}

export const zhihuSearchSnapshot = rawSnapshot as ZhihuSearchSnapshot;

/** Convert raw search results into reviewable cards without treating them as facts. */
export const zhihuSearchCards: SourceCard[] = zhihuSearchSnapshot.items.map(
  (item) =>
    SourceCardSchema.parse({
      id: item.id,
      contentId: item.contentId,
      title: item.title,
      url: item.url,
      author: item.author,
      contentType: item.contentType === "Article" ? "Article" : "Answer",
      stance: "conditional",
      categories: ["retrieved_candidate"],
      claim: item.excerpt.slice(0, 280) || "检索结果未提供摘要",
      conditions: ["检索候选，适用边界需要人工确认"],
      consequence: "该内容只能作为社区经验样本，不能单独证明结论。",
      authorityLevel: 1,
      rankingScore: item.rankingScore,
      voteUpCount: item.voteUpCount,
      reviewStatus: "approved_with_caution",
      reviewNote: "知乎开放平台检索候选，尚未完成当前议题的人工审核。"
    })
);
