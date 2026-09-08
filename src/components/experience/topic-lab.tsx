"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  FlaskConical,
  GitFork,
  LoaderCircle,
  ShieldAlert,
  Sparkles
} from "lucide-react";

import { PageFrame } from "@/components/experience/page-frame";
import { DecisionBriefPanel } from "@/components/experience/decision-brief-panel";
import { EvidenceClustersPanel } from "@/components/experience/evidence-clusters-panel";
import { Button } from "@/components/ui/button";
import {
  generateTopicDraft,
  confirmDecisionBrief,
  createDecisionBrief,
  TOPIC_PRESETS,
  type TopicDraft
} from "@/features/game";
import type { EvidenceOrganization, EvidenceSource } from "@/features/evidence";

type SearchResponse = {
  status: "ready" | "empty" | "unavailable" | "rate-limited";
  message: string;
  cached: boolean;
  items: EvidenceSource[];
};

type OrganizationFailure = {
  provenance: "organization-failure";
  failure: { userMessage: string };
};

export function TopicLab() {
  const [input, setInput] = useState<string>(TOPIC_PRESETS[0].input);
  const [draft, setDraft] = useState<TopicDraft>(() =>
    generateTopicDraft(TOPIC_PRESETS[0].input)
  );
  const [brief, setBrief] = useState(() =>
    createDecisionBrief(TOPIC_PRESETS[0].input)
  );
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [evidence, setEvidence] = useState<SearchResponse>();
  const [organization, setOrganization] = useState<EvidenceOrganization>();
  const [evidenceNotice, setEvidenceNotice] = useState<string>();
  const [isSearching, setIsSearching] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);

  function generate() {
    try {
      setDraft(generateTopicDraft(input));
      setBrief(createDecisionBrief(input));
      setError(undefined);
      setSaved(false);
      setEvidence(undefined);
      setOrganization(undefined);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "暂时无法生成候选结构"
      );
    }
  }

  function choosePreset(value: string) {
    setInput(value);
    try {
      setDraft(generateTopicDraft(value));
      setBrief(createDecisionBrief(value));
      setError(undefined);
      setSaved(false);
      setEvidence(undefined);
      setOrganization(undefined);
    } catch {
      setError("这个预设暂时无法生成");
    }
  }

  function saveDraft() {
    window.localStorage.setItem(
      "life-fork-machine:topic-draft:v1",
      JSON.stringify({ draft, brief })
    );
    setSaved(true);
  }

  async function retrieveEvidence() {
    if (!brief.confirmed || brief.safety.status === "stop") {
      setEvidenceNotice("先确认上面的决策简报，才能开始检索。");
      return;
    }
    setIsSearching(true);
    setEvidenceNotice(undefined);
    setOrganization(undefined);
    try {
      const response = await fetch("/api/evidence/zhihu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief)
      });
      const result = (await response.json()) as SearchResponse;
      setEvidence(result);
      setEvidenceNotice(result.message);
    } catch {
      setEvidenceNotice("知乎检索暂不可用；没有使用旧内容代替这次结果。");
    } finally {
      setIsSearching(false);
    }
  }

  async function organizeEvidence() {
    if (!evidence || evidence.status !== "ready" || evidence.items.length < 3) {
      setEvidenceNotice("至少需要 3 条可追溯来源，才能进行观点整理。");
      return;
    }
    setIsOrganizing(true);
    setEvidenceNotice(undefined);
    try {
      const response = await fetch("/api/evidence/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, evidence })
      });
      const result = (await response.json()) as
        EvidenceOrganization | OrganizationFailure;
      if (
        "provenance" in result &&
        result.provenance === "organization-failure"
      ) {
        setEvidenceNotice(result.failure.userMessage);
        return;
      }
      if (!response.ok) {
        setEvidenceNotice("观点整理没有完成；请保留来源并稍后重试。");
        return;
      }
      setOrganization(result as EvidenceOrganization);
    } catch {
      setEvidenceNotice("观点整理暂不可用；来源候选仍保留，尚未形成结论。");
    } finally {
      setIsOrganizing(false);
    }
  }

  return (
    <PageFrame
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/evidence-review">
              <FileCheck2 aria-hidden="true" />
              素材审核
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/">
              <ArrowLeft aria-hidden="true" />
              返回首页
            </Link>
          </Button>
        </div>
      }
      description="把任意困境先拆成三条路、三个关键假设和一个七天验证。生成结果只是候选结构，经过知乎素材审核后才进入正式推演。"
      eyebrow="TOPIC LAB / D21–D23"
      step={1}
      title="先把你的问题，编译成一场人生实验。"
    >
      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <section className="glass-panel h-fit rounded-3xl border border-white/10 p-5 sm:p-7 xl:sticky xl:top-24">
          <div className="flex items-center gap-3">
            <span className="bg-zhihu/10 flex size-10 items-center justify-center rounded-xl text-blue-300">
              <Sparkles aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">议题切换器</p>
              <p className="text-muted-foreground mt-1 text-xs">
                先选预设，也可以直接输入自己的问题。
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {TOPIC_PRESETS.map((preset) => (
              <button
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  input === preset.input
                    ? "border-zhihu/45 bg-zhihu/10"
                    : "border-white/[0.08] bg-white/[0.025] hover:border-white/20"
                }`}
                key={preset.id}
                onClick={() => choosePreset(preset.input)}
                type="button"
              >
                <p className="text-sm font-medium">{preset.label}</p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  {preset.input}
                </p>
              </button>
            ))}
          </div>
          <label className="text-muted-foreground mt-6 block text-xs">
            你真正想想清楚的问题
            <textarea
              className="focus:border-zhihu/50 mt-2 min-h-28 w-full resize-y rounded-2xl border border-white/[0.1] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              maxLength={120}
              onChange={(event) => setInput(event.target.value)}
              placeholder="例如：我要不要离开大城市回老家？"
              value={input}
            />
          </label>
          <Button className="mt-3 w-full" onClick={generate}>
            生成候选结构
            <ArrowRight aria-hidden="true" />
          </Button>
          {error ? (
            <p className="text-world-leap mt-3 text-xs" role="alert">
              {error}
            </p>
          ) : null}
          <div className="border-signal-lime/20 bg-signal-lime/[0.05] mt-6 rounded-2xl border p-4">
            <p className="text-signal-lime flex items-center gap-2 text-xs font-medium">
              <ShieldAlert aria-hidden="true" className="size-4" />
              安全边界
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              不输出成功率，不替你做决定，不把未经审核的生成内容伪装成知乎事实。
            </p>
            <p className="text-muted-foreground mt-3 border-t border-white/[0.08] pt-3 text-xs leading-5">
              当前模式：<span className="text-blue-200">演示缓存</span>。实时 AI
              网关已准备，但本页会在议题与证据均通过审核后才接入它。
            </p>
          </div>
        </section>

        <section aria-labelledby="draft-title" className="space-y-6">
          <DecisionBriefPanel
            brief={brief}
            onChange={setBrief}
            onConfirm={() => setBrief(confirmDecisionBrief(brief))}
          />
          <section className="glass-panel border-zhihu/20 rounded-3xl border p-5 sm:p-7">
            <p className="text-xs tracking-[0.16em] text-blue-200 uppercase">
              Live evidence / 知乎候选
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              先找真实经验，再整理它们到底在说什么。
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              检索结果只是候选来源。整理时会保留每条观点对应的原文入口，不会把“多数人说”变成替你做决定。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                disabled={isSearching || brief.safety.status === "stop"}
                onClick={retrieveEvidence}
                variant="secondary"
              >
                {isSearching ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <FileCheck2 aria-hidden="true" />
                )}
                {isSearching ? "正在检索知乎候选" : "获取知乎候选"}
              </Button>
              {evidence?.status === "ready" ? (
                <Button
                  disabled={isOrganizing || evidence.items.length < 3}
                  onClick={organizeEvidence}
                >
                  {isOrganizing ? (
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Sparkles aria-hidden="true" />
                  )}
                  {isOrganizing
                    ? "正在整理观点"
                    : `整理 ${evidence.items.length} 条来源`}
                </Button>
              ) : null}
            </div>
            {evidence ? (
              <p className="mt-4 text-xs text-white/70">
                本次状态：
                <span className="text-blue-200">{evidence.status}</span> · 候选{" "}
                {evidence.items.length} 条
                {evidence.cached ? " · 使用服务端短时缓存" : ""}
              </p>
            ) : null}
            {evidenceNotice ? (
              <p className="mt-3 text-xs leading-5 text-white/60" role="status">
                {evidenceNotice}
              </p>
            ) : null}
          </section>
          {organization && evidence ? (
            <EvidenceClustersPanel
              organization={organization}
              sources={evidence.items}
            />
          ) : null}
          <div className="glass-panel rounded-3xl border border-white/10 p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
                  Candidate scenario pack
                </p>
                <h2 className="mt-2 text-2xl font-semibold" id="draft-title">
                  {draft.title}
                </h2>
                <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-7">
                  {draft.tension}
                </p>
              </div>
              <span className="border-world-leap/25 bg-world-leap/10 text-world-leap rounded-full border px-3 py-1.5 text-xs">
                待知乎素材审核
              </span>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {draft.worlds.map((world) => (
                <article
                  className="surface-lift rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"
                  key={world.id}
                >
                  <div className="flex items-center gap-2">
                    <GitFork
                      aria-hidden="true"
                      className="size-4 text-blue-300"
                    />
                    <h3 className="text-sm font-medium">{world.name}</h3>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/80">
                    {world.tagline}
                  </p>
                  <p className="text-muted-foreground mt-3 text-[10px] leading-4">
                    要看：{world.focus}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">
              <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
                三个先查的假设
              </p>
              <div className="mt-4 space-y-3">
                {draft.assumptions.map((assumption, index) => (
                  <article
                    className="rounded-2xl border border-white/[0.08] p-4"
                    key={assumption.label}
                  >
                    <p className="font-mono text-[10px] text-blue-200">
                      0{index + 1}
                    </p>
                    <h3 className="mt-2 text-sm font-medium">
                      {assumption.label}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      核验方式：{assumption.checkQuestion}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="border-signal-lime/20 bg-signal-lime/[0.04] rounded-3xl border p-5 sm:p-7">
              <p className="text-signal-lime flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
                <FlaskConical aria-hidden="true" className="size-4" />
                七天现实实验
              </p>
              <h2 className="mt-3 text-xl font-semibold">
                {draft.experiment.title}
              </h2>
              <p className="text-muted-foreground mt-3 text-xs leading-5">
                {draft.experiment.question}
              </p>
              <ol className="mt-5 space-y-3">
                {draft.experiment.steps.map((step, index) => (
                  <li
                    className="flex gap-3 text-xs leading-5 text-white/80"
                    key={step}
                  >
                    <span className="bg-signal-lime/10 text-signal-lime flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px]">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="text-muted-foreground mt-5 border-t border-white/[0.08] pt-4 text-xs leading-5">
                退出规则：{draft.experiment.exitRule}
              </p>
            </section>
          </div>

          <div className="border-world-leap/20 bg-world-leap/[0.04] rounded-3xl border p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-world-leap text-xs font-medium tracking-[0.16em] uppercase">
                  生成状态：
                  {draft.safety.status === "needs-review" ? "需要审核" : "草稿"}
                </p>
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  {draft.safety.message}
                </p>
              </div>
              <Button onClick={saveDraft} size="sm" variant="secondary">
                {saved ? <Check aria-hidden="true" /> : null}
                {saved ? "已保存候选结构" : "保存候选结构"}
              </Button>
            </div>
            <p className="text-muted-foreground mt-4 border-t border-white/[0.08] pt-4 text-[10px] leading-4">
              当前正式推演仍从创业议题入口进入。候选结构保存到本机，后续接入知乎检索和人工审核后再发布。
            </p>
          </div>
        </section>
      </div>
    </PageFrame>
  );
}
