"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { PageFrame } from "@/components/experience/page-frame";
import { Button } from "@/components/ui/button";
import type { CommunityLensSelection } from "@/features/community-lenses";
import type { DecisionBrief } from "@/features/decision-brief";
import type { EvidenceSource } from "@/features/evidence";

const HANDOFF_KEY = "life-fork-machine:zhihu-link-import:v1";

type LinkImportResponse = {
  status: "ready" | "empty" | "unavailable" | "rate-limited";
  message: string;
  authorization?: string;
  match: "exact" | "related" | "none";
  brief?: DecisionBrief;
  items: EvidenceSource[];
};

export function ZhihuLinkImport() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [focus, setFocus] = useState("");
  const [result, setResult] = useState<LinkImportResponse>();
  const [isLoading, setIsLoading] = useState(false);
  const [resonatesSourceId, setResonatesSourceId] = useState("");
  const [unsettlesSourceId, setUnsettlesSourceId] = useState("");

  async function importLink() {
    setIsLoading(true);
    setResult(undefined);
    try {
      const response = await fetch("/api/evidence/zhihu-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: url, ...(focus.trim() ? { focus } : {}) })
      });
      const next = (await response.json()) as LinkImportResponse;
      setResult(next);
      setResonatesSourceId("");
      setUnsettlesSourceId("");
    } catch {
      setResult({
        status: "unavailable",
        message: "链接导入暂不可用；没有使用旧内容代替本次结果。",
        match: "none",
        items: []
      });
    } finally {
      setIsLoading(false);
    }
  }

  function continueToTopicLab() {
    if (!result?.brief || result.items.length < 3) return;
    const communityViews: CommunityLensSelection = {
      resonatesSourceId,
      unsettlesSourceId
    };
    if (
      !resonatesSourceId ||
      !unsettlesSourceId ||
      resonatesSourceId === unsettlesSourceId
    )
      return;
    window.localStorage.setItem(
      HANDOFF_KEY,
      JSON.stringify({
        brief: result.brief,
        evidence: { status: "ready", items: result.items },
        communityViews,
        importedAt: new Date().toISOString()
      })
    );
    router.push("/topic-lab?from=zhihu-link");
  }

  const canContinue =
    result?.status === "ready" &&
    Boolean(result.brief) &&
    result.items.length >= 3 &&
    Boolean(resonatesSourceId) &&
    Boolean(unsettlesSourceId) &&
    resonatesSourceId !== unsettlesSourceId;

  return (
    <PageFrame
      actions={
        <Button asChild size="sm" variant="ghost">
          <Link href="/topic-lab">改为手动输入议题</Link>
        </Button>
      }
      description="粘贴一个公开知乎问题、回答或专栏文章。系统只从官方公开检索里找可回看的候选，再由你选出最认同和最想反驳的两个视角。"
      eyebrow="ZHIHU LINK IMPORT / TASK-041"
      step={1}
      title="从一场已经在发生的讨论开始。"
    >
      <section className="mx-auto max-w-4xl space-y-6">
        <div className="glass-panel border-zhihu/25 rounded-3xl border p-5 sm:p-7">
          <label className="text-muted-foreground block text-xs">
            知乎公开链接
            <input
              className="focus:border-zhihu/50 mt-2 h-12 w-full rounded-2xl border border-white/[0.1] bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/35"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.zhihu.com/question/…"
              type="url"
              value={url}
            />
          </label>
          <label className="text-muted-foreground mt-4 block text-xs">
            你最想想清楚的方向（可选；官方索引没返回原链接时才有帮助）
            <input
              className="focus:border-zhihu/50 mt-2 h-12 w-full rounded-2xl border border-white/[0.1] bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/35"
              maxLength={240}
              onChange={(event) => setFocus(event.target.value)}
              placeholder="例如：我该怎样评估转行的现实成本？"
              value={focus}
            />
          </label>
          <Button
            className="mt-5"
            disabled={!url.trim() || isLoading}
            onClick={importLink}
          >
            {isLoading ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Link2 aria-hidden="true" />
            )}
            {isLoading ? "正在查询公开候选" : "导入公开讨论"}
          </Button>
          <div className="border-signal-lime/20 bg-signal-lime/[0.04] mt-5 rounded-2xl border p-4 text-xs leading-5 text-white/70">
            <p className="text-signal-lime flex items-center gap-2 font-medium">
              <ShieldCheck aria-hidden="true" className="size-4" />
              授权与隐私边界
            </p>
            <p className="mt-2">
              仅查询知乎公开检索结果；不读取你的账号、私信、收藏、关注或任何私有内容。不会自动发言或发布。
            </p>
          </div>
        </div>

        {result ? (
          <section className="space-y-4" aria-live="polite">
            <div className="rounded-3xl border border-white/[0.1] bg-white/[0.025] p-5">
              <p className="text-xs tracking-[0.16em] text-blue-200 uppercase">
                Import result
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                {result.match === "exact"
                  ? "找到了这条公开内容"
                  : result.match === "related"
                    ? "找到了相关讨论，尚未确认原链接"
                    : "这次没有可带入的候选"}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                {result.message}
              </p>
              {result.authorization ? (
                <p className="mt-3 text-xs text-white/50">
                  {result.authorization}
                </p>
              ) : null}
            </div>

            {result.items.length ? (
              <div className="space-y-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    把两种不同的经验放进推演
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    不是让社区替你投票。选一个最像你现在想法的，再选一个你最不想面对、但值得核对的反例；这两项会改变候选假设和实验问题。
                  </p>
                </div>
                {result.items.map((source) => (
                  <article
                    className="rounded-3xl border border-white/[0.1] bg-white/[0.025] p-5"
                    key={source.sourceId}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{source.title}</h3>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {source.author} · {source.voteUpCount} 赞
                        </p>
                      </div>
                      <a
                        className="inline-flex items-center gap-1 text-xs text-blue-200"
                        href={source.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        查看原文{" "}
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </a>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-white/75">
                      {source.excerpt}
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <label
                        className={`cursor-pointer rounded-2xl border p-3 text-xs ${resonatesSourceId === source.sourceId ? "border-signal-lime/50 bg-signal-lime/[0.08] text-signal-lime" : "border-white/[0.1] text-white/65"}`}
                      >
                        <input
                          checked={resonatesSourceId === source.sourceId}
                          className="sr-only"
                          name="resonates"
                          onChange={() => setResonatesSourceId(source.sourceId)}
                          type="radio"
                        />
                        这个观点最像我
                      </label>
                      <label
                        className={`cursor-pointer rounded-2xl border p-3 text-xs ${unsettlesSourceId === source.sourceId ? "border-world-leap/50 bg-world-leap/[0.08] text-world-leap" : "border-white/[0.1] text-white/65"}`}
                      >
                        <input
                          checked={unsettlesSourceId === source.sourceId}
                          className="sr-only"
                          name="unsettles"
                          onChange={() => setUnsettlesSourceId(source.sourceId)}
                          type="radio"
                        />
                        这个观点让我不舒服
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {result.status === "ready" && result.items.length < 3 ? (
              <p className="text-world-leap text-sm">
                至少需要 3
                条可追溯公开来源，才会进入候选三幕；当前结果会停留在这里，不会补造观点。
              </p>
            ) : null}
            <Button disabled={!canContinue} onClick={continueToTopicLab}>
              把所选观点带入候选三幕
            </Button>
          </section>
        ) : null}
      </section>
    </PageFrame>
  );
}
