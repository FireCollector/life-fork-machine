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
  ShieldAlert,
  Sparkles
} from "lucide-react";

import { PageFrame } from "@/components/experience/page-frame";
import { Button } from "@/components/ui/button";
import {
  generateTopicDraft,
  TOPIC_PRESETS,
  type TopicDraft
} from "@/features/game";

export function TopicLab() {
  const [input, setInput] = useState<string>(TOPIC_PRESETS[0].input);
  const [draft, setDraft] = useState<TopicDraft>(() =>
    generateTopicDraft(TOPIC_PRESETS[0].input)
  );
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  function generate() {
    try {
      setDraft(generateTopicDraft(input));
      setError(undefined);
      setSaved(false);
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
      setError(undefined);
      setSaved(false);
    } catch {
      setError("这个预设暂时无法生成");
    }
  }

  function saveDraft() {
    window.localStorage.setItem(
      "life-fork-machine:topic-draft:v1",
      JSON.stringify(draft)
    );
    setSaved(true);
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
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-white/[0.1] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-zhihu/50"
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
          </div>
        </section>

        <section aria-labelledby="draft-title" className="space-y-6">
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
                    <GitFork aria-hidden="true" className="text-blue-300 size-4" />
                    <h3 className="text-sm font-medium">{world.name}</h3>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/80">{world.tagline}</p>
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
                  <article className="rounded-2xl border border-white/[0.08] p-4" key={assumption.label}>
                    <p className="text-blue-200 text-[10px] font-mono">0{index + 1}</p>
                    <h3 className="mt-2 text-sm font-medium">{assumption.label}</h3>
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
              <h2 className="mt-3 text-xl font-semibold">{draft.experiment.title}</h2>
              <p className="text-muted-foreground mt-3 text-xs leading-5">
                {draft.experiment.question}
              </p>
              <ol className="mt-5 space-y-3">
                {draft.experiment.steps.map((step, index) => (
                  <li className="flex gap-3 text-xs leading-5 text-white/80" key={step}>
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
                  生成状态：{draft.safety.status === "needs-review" ? "需要审核" : "草稿"}
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
