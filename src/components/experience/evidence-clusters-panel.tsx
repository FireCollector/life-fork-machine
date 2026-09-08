"use client";

import { Check, ExternalLink, PencilLine, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  reviseEvidenceCluster,
  type EvidenceOrganization,
  type EvidenceSource
} from "@/features/evidence";

type Props = {
  organization: EvidenceOrganization;
  sources: EvidenceSource[];
};

const kindLabel = {
  agreement: "共同提醒",
  disagreement: "保留分歧",
  applicability: "适用边界"
} as const;

export function EvidenceClustersPanel({ organization, sources }: Props) {
  const [clusters, setClusters] = useState(organization.clusters);
  const sourceById = new Map(
    sources.map((source) => [source.sourceId, source])
  );

  function revise(
    index: number,
    patch: Parameters<typeof reviseEvidenceCluster>[1]
  ) {
    setClusters((current) =>
      current.map((cluster, currentIndex) =>
        currentIndex === index
          ? reviseEvidenceCluster(cluster, patch, "当前审核者")
          : cluster
      )
    );
  }

  return (
    <section aria-labelledby="evidence-clusters-title" className="space-y-4">
      <div className="glass-panel border-zhihu/25 rounded-3xl border p-5 sm:p-7">
        <p className="text-xs tracking-[0.16em] text-blue-200 uppercase">
          {organization.provenance === "ai-assisted"
            ? "AI-assisted evidence organization"
            : "Rules-assisted current-source organization"}
        </p>
        <h2
          className="mt-2 text-2xl font-semibold"
          id="evidence-clusters-title"
        >
          把回答分开看，别急着拼成一个答案。
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {organization.provenance === "ai-assisted"
            ? "AI 只按引用来源整理共同点、分歧和适用边界。"
            : "实时 AI 未完成时，系统只展示本次来源摘要和你的核验问题，不会伪造 AI 结论。"}
          每一条观点都能回到原文；你可以修改条件、风险或审核状态，修改会留下记录。
        </p>
        <p className="text-muted-foreground mt-3 text-xs">
          {organization.provenance === "ai-assisted"
            ? `模型：${organization.clusters[0]?.rationale.model ?? "未记录"} · `
            : "当前模式：规则辅助 · "}
          {organization.disclaimer}
        </p>
      </div>

      {clusters.map((cluster, index) => (
        <article
          className="rounded-3xl border border-white/[0.1] bg-white/[0.025] p-5 sm:p-6"
          key={cluster.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-blue-200 uppercase">
                {kindLabel[cluster.kind]}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{cluster.title}</h3>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${cluster.review.status === "approved" ? "border-signal-lime/30 text-signal-lime" : cluster.review.status === "rejected" ? "border-world-leap/30 text-world-leap" : "border-white/15 text-white/60"}`}
            >
              {cluster.review.status === "approved"
                ? "已通过"
                : cluster.review.status === "rejected"
                  ? "已排除"
                  : "待审核"}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {cluster.claims.map((claim) => (
              <div
                className="rounded-2xl border border-white/[0.08] bg-black/10 p-4"
                key={claim.id}
              >
                <p className="text-sm leading-6 text-white/90">{claim.text}</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  不确定性：{claim.uncertainty}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {claim.sourceIds.map((sourceId) => {
                    const source = sourceById.get(sourceId);
                    return source ? (
                      <a
                        className="inline-flex items-center gap-1 rounded-full border border-blue-300/20 px-2.5 py-1 text-[10px] text-blue-200 hover:border-blue-300/50"
                        href={source.url}
                        key={sourceId}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {source.author} · 原文{" "}
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </a>
                    ) : (
                      <span className="text-world-leap text-xs" key={sourceId}>
                        缺失来源 {sourceId}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-muted-foreground text-xs">
              放到自己身上前要满足什么
              <textarea
                className="focus:border-zhihu/50 mt-2 min-h-24 w-full rounded-2xl border border-white/[0.1] bg-black/15 p-3 text-xs leading-5 text-white outline-none"
                defaultValue={cluster.conditions.join("\n")}
                onBlur={(event) =>
                  revise(index, {
                    conditions: event.target.value
                      .split("\n")
                      .map((value) => value.trim())
                      .filter(Boolean)
                  })
                }
              />
            </label>
            <label className="text-muted-foreground text-xs">
              这里最容易忽略的风险
              <textarea
                className="focus:border-zhihu/50 mt-2 min-h-24 w-full rounded-2xl border border-white/[0.1] bg-black/15 p-3 text-xs leading-5 text-white outline-none"
                defaultValue={cluster.risks.join("\n")}
                onBlur={(event) =>
                  revise(index, {
                    risks: event.target.value
                      .split("\n")
                      .map((value) => value.trim())
                      .filter(Boolean)
                  })
                }
              />
            </label>
          </div>
          <div className="border-signal-lime/15 bg-signal-lime/[0.03] mt-4 rounded-2xl border p-4">
            <p className="text-signal-lime text-xs font-medium">
              可以带走核验的动作
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-white/75">
              {cluster.suggestedActions.map((action) => (
                <li key={action.text}>· {action.text}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => revise(index, { status: "approved" })}
              size="sm"
              variant={
                cluster.review.status === "approved" ? "default" : "secondary"
              }
            >
              <Check aria-hidden="true" />
              通过
            </Button>
            <Button
              onClick={() => revise(index, { status: "rejected" })}
              size="sm"
              variant={
                cluster.review.status === "rejected" ? "destructive" : "ghost"
              }
            >
              <X aria-hidden="true" />
              排除
            </Button>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-white/45">
              <PencilLine aria-hidden="true" className="size-3" />
              已有 {cluster.review.revisions.length} 条人工修改记录
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}
