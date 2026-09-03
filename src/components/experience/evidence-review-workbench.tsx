"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileCheck2,
  LockKeyhole,
  Search,
  ShieldAlert,
  X
} from "lucide-react";

import { PageFrame } from "@/components/experience/page-frame";
import { Button } from "@/components/ui/button";
import {
  createReviewPackage,
  createReviewVersion,
  demoContent,
  zhihuSearchCards,
  zhihuSearchSnapshot,
  generateTopicDraft,
  publishReviewPackage,
  summarizeReviewPackage,
  TOPIC_PRESETS,
  updateReviewDecision,
  type ReviewDecision,
  type ReviewPackage,
  type SourceCard,
  type TopicDraft
} from "@/features/game";

const STORAGE_KEY = "life-fork-machine:evidence-review:v1";
const reviewSources = zhihuSearchCards.length > 0 ? zhihuSearchCards : demoContent.sourceCards;

const decisionMeta: Record<ReviewDecision, { label: string; className: string }> = {
  pending: { label: "待审核", className: "text-white/60 border-white/15" },
  approved: { label: "已通过", className: "text-signal-lime border-signal-lime/30" },
  rejected: { label: "已排除", className: "text-world-leap border-world-leap/30" }
};

function initialDraft() {
  return generateTopicDraft(TOPIC_PRESETS[0].input);
}

function readStoredReview() {
  const fallbackDraft = initialDraft();
  const fallbackPackage = createReviewPackage(
    fallbackDraft,
    reviewSources,
    undefined,
    zhihuSearchSnapshot.query
  );
  if (typeof window === "undefined") {
    return { draft: fallbackDraft, pkg: fallbackPackage, query: TOPIC_PRESETS[0].input };
  }
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { draft: fallbackDraft, pkg: fallbackPackage, query: TOPIC_PRESETS[0].input };
  }
  try {
    const parsed = JSON.parse(saved) as ReviewPackage;
    const sourceIds = new Set(reviewSources.map((source) => source.id));
    if (!parsed.candidates?.every((candidate) => sourceIds.has(candidate.sourceId))) {
      throw new Error("审核快照已更新");
    }
    return {
      draft: generateTopicDraft(parsed.question),
      pkg: parsed,
      query: parsed.question
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return { draft: fallbackDraft, pkg: fallbackPackage, query: TOPIC_PRESETS[0].input };
  }
}

export function EvidenceReviewWorkbench() {
  const [initialReview] = useState(readStoredReview);
  const [draft, setDraft] = useState<TopicDraft>(initialReview.draft);
  const [queryInput, setQueryInput] = useState<string>(initialReview.query);
  const [pkg, setPkg] = useState<ReviewPackage>(initialReview.pkg);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pkg));
  }, [pkg]);

  const summary = summarizeReviewPackage(pkg);
  const sourceById = useMemo(
    () => new Map(reviewSources.map((source) => [source.id, source])),
    []
  );

  function createPackage() {
    try {
      const nextDraft = generateTopicDraft(queryInput);
      setDraft(nextDraft);
      if (!/创业|领导|辞职|股权|高薪|现金流/.test(nextDraft.normalizedQuestion)) {
        setNotice(
          `当前快照只覆盖“${zhihuSearchSnapshot.query}”。请先运行 fetch-zhihu-evidence.mjs 更新素材，再审核这个议题。`
        );
        return;
      }
      setPkg((current) =>
        current.draftId === nextDraft.id
          ? createReviewVersion(current, nextDraft, reviewSources, undefined, zhihuSearchSnapshot.query)
          : createReviewPackage(nextDraft, reviewSources, undefined, zhihuSearchSnapshot.query)
      );
      setNotice("已生成新的审核版本，所有素材需要重新确认。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "暂时无法生成审核包");
    }
  }

  function decide(sourceId: string, decision: ReviewDecision, note = "") {
    setPkg((current) => updateReviewDecision(current, sourceId, decision, note));
    setNotice(undefined);
  }

  function publish() {
    try {
      setPkg((current) => publishReviewPackage(current));
      setNotice("审核包已发布为可接入正式推演的版本。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "还不能发布");
    }
  }

  return (
    <PageFrame
      actions={
        <Button asChild size="sm" variant="ghost">
          <Link href="/topic-lab">
            <ArrowLeft aria-hidden="true" />
            返回议题实验室
          </Link>
        </Button>
      }
      description="先用知乎开放平台快照找素材，再由人逐条判断相关性、风险和是否能支撑剧本。没有通过审核的内容不会进入正式推演。"
      eyebrow="EVIDENCE REVIEW / D25–D26"
      step={1}
      title="把候选剧本，交给真实素材过一遍。"
    >
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="glass-panel h-fit rounded-3xl border border-white/10 p-5 sm:p-7 xl:sticky xl:top-24">
          <div className="flex items-center gap-3">
            <span className="bg-zhihu/10 flex size-10 items-center justify-center rounded-xl text-blue-300">
              <Search aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">素材检索任务</p>
              <p className="text-muted-foreground mt-1 text-xs">
                知乎开放平台快照 · {zhihuSearchSnapshot.retrievedAt.slice(0, 10)}
              </p>
              <p className="text-muted-foreground mt-1 text-[10px] leading-4">
                快照检索词：{zhihuSearchSnapshot.query}
              </p>
            </div>
          </div>
          <label className="text-muted-foreground mt-6 block text-xs">
            议题问题
            <textarea
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-white/[0.1] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-zhihu/50"
              maxLength={120}
              onChange={(event) => setQueryInput(event.target.value)}
              value={queryInput}
            />
          </label>
          <Button className="mt-3 w-full" onClick={createPackage}>
            重新生成审核包
          </Button>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-signal-lime/20 bg-signal-lime/[0.04] p-3">
              <p className="text-signal-lime text-lg font-semibold">{summary.approved}</p>
              <p className="text-muted-foreground mt-1 text-[10px]">已通过</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-lg font-semibold">{summary.pending}</p>
              <p className="text-muted-foreground mt-1 text-[10px]">待处理</p>
            </div>
            <div className="rounded-2xl border border-world-leap/20 bg-world-leap/[0.04] p-3">
              <p className="text-world-leap text-lg font-semibold">{summary.rejected}</p>
              <p className="text-muted-foreground mt-1 text-[10px]">已排除</p>
            </div>
          </div>
          <div className="border-signal-lime/20 bg-signal-lime/[0.04] mt-6 rounded-2xl border p-4">
            <p className="text-signal-lime flex items-center gap-2 text-xs font-medium">
              <ShieldAlert aria-hidden="true" className="size-4" />
              发布门槛
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              至少通过 3 条素材，并处理完所有待审核项。发布后会锁定当前版本，正式推演只读取已发布素材。
            </p>
          </div>
          <Button className="mt-4 w-full" disabled={!summary.canPublish} onClick={publish}>
            {pkg.status === "published" ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
            {pkg.status === "published" ? "已发布当前版本" : "发布候选剧本"}
          </Button>
          {notice ? (
            <p className="text-blue-200 mt-3 text-xs leading-5" role="status">
              {notice}
            </p>
          ) : null}
        </section>

        <section className="space-y-5" aria-labelledby="review-title">
          <div className="glass-panel rounded-3xl border border-white/10 p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
                  Review package v{pkg.version}
                </p>
                <h2 className="mt-2 text-2xl font-semibold" id="review-title">
                  {draft.title}
                </h2>
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  检索词：{pkg.query}
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1.5 text-xs ${pkg.status === "published" ? "border-signal-lime/30 text-signal-lime" : "border-world-bridge/30 text-world-bridge"}`}>
                {pkg.status === "published" ? "已发布" : "审核中"}
              </span>
            </div>
          </div>

          {pkg.candidates.map((candidate, index) => {
            const source = sourceById.get(candidate.sourceId) as SourceCard | undefined;
            if (!source) return null;
            const meta = decisionMeta[candidate.decision];
            return (
              <article className="surface-lift rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6" key={candidate.sourceId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="bg-blue-300/10 text-blue-200 flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-xs">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-base font-medium leading-6">{source.title}</h3>
                      <p className="text-muted-foreground mt-1 text-[10px]">{source.author} · {source.contentType} · 互动 {source.voteUpCount}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] ${meta.className}`}>{meta.label}</span>
                </div>
                <p className="text-muted-foreground mt-4 text-xs leading-6">{source.claim}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.08] bg-black/10 p-3">
                    <p className="text-[10px] font-medium text-blue-200">适用条件</p>
                    <p className="text-muted-foreground mt-1.5 text-xs leading-5">{source.conditions.join("；")}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-black/10 p-3">
                    <p className="text-[10px] font-medium text-world-bridge">审核提醒</p>
                    <p className="text-muted-foreground mt-1.5 text-xs leading-5">{source.reviewNote}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button disabled={pkg.status === "published"} onClick={() => decide(source.id, "approved")} size="sm" variant={candidate.decision === "approved" ? "default" : "secondary"}>
                    <Check aria-hidden="true" />
                    通过
                  </Button>
                  <Button disabled={pkg.status === "published"} onClick={() => decide(source.id, "rejected")} size="sm" variant={candidate.decision === "rejected" ? "destructive" : "ghost"}>
                    <X aria-hidden="true" />
                    排除
                  </Button>
                  <a className="text-muted-foreground ml-auto inline-flex items-center gap-1 text-xs hover:text-white" href={source.url} rel="noreferrer" target="_blank">
                    查看知乎原文 <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                </div>
                <label className="text-muted-foreground mt-4 block text-[10px]">
                  审核备注（可选）
                  <input
                    className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-black/15 px-3 py-2 text-xs text-white outline-none focus:border-zhihu/50"
                    defaultValue={candidate.note ?? ""}
                    disabled={pkg.status === "published"}
                    maxLength={240}
                    onBlur={(event) => decide(source.id, candidate.decision, event.target.value)}
                    placeholder="例如：只作为风险提醒，不支撑成功率判断"
                  />
                </label>
              </article>
            );
          })}
          <div className="border-white/10 bg-white/[0.02] rounded-2xl border p-4 text-xs leading-5 text-white/60">
            <FileCheck2 aria-hidden="true" className="mr-2 inline size-4 text-signal-lime" />
            版本 {pkg.version} · {pkg.status === "published" ? "已通过审核门禁，可被正式推演读取" : "当前仍是审核草稿，不会改变正式创业 Demo"}
          </div>
        </section>
      </div>
    </PageFrame>
  );
}
