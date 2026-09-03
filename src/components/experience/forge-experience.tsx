"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  ExternalLink,
  GitFork,
  LoaderCircle,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";

import { PageFrame } from "@/components/experience/page-frame";
import { Button } from "@/components/ui/button";
import {
  createSession,
  saveSession,
  selectWorld,
  type Scenario,
  type SourceCard,
  type WorldId
} from "@/features/game";
import { useStoredCalibration } from "@/features/game/use-stored-calibration";
import { cn } from "@/lib/utils";

const forgeSteps = [
  {
    icon: ScanSearch,
    label: "读取真实经历",
    detail: "从人工审核缓存装入 8 张知乎来源"
  },
  {
    icon: SlidersHorizontal,
    label: "拆出观点与条件",
    detail: "保留支持、反对与条件立场"
  },
  { icon: GitFork, label: "编译平行人生", detail: "把同一组证据绑定到三条世界" }
];

const stanceMeta = {
  support: {
    label: "支持行动",
    className: "border-signal-lime/20 bg-signal-lime/10 text-signal-lime"
  },
  oppose: {
    label: "反对冒进",
    className: "border-world-leap/20 bg-world-leap/10 text-world-leap"
  },
  conditional: {
    label: "条件成立",
    className: "border-zhihu/20 bg-zhihu/10 text-blue-200"
  }
} as const;

const worldMeta: Record<
  WorldId,
  { code: string; className: string; glow: string }
> = {
  stay: {
    code: "A",
    className: "text-world-stay",
    glow: "hover:border-world-stay/45"
  },
  leap: {
    code: "B",
    className: "text-world-leap",
    glow: "hover:border-world-leap/45"
  },
  bridge: {
    code: "C",
    className: "text-world-bridge",
    glow: "hover:border-world-bridge/45"
  }
};

const fallbackWorldMeta = [
  { className: "text-world-stay", glow: "hover:border-world-stay/45" },
  { className: "text-world-leap", glow: "hover:border-world-leap/45" },
  { className: "text-world-bridge", glow: "hover:border-world-bridge/45" }
] as const;

type StanceFilter = "all" | SourceCard["stance"];

export function ForgeExperience({
  evidenceRetrievedAt,
  scenario,
  sourceCards
}: {
  evidenceRetrievedAt: string;
  scenario: Scenario;
  sourceCards: SourceCard[];
}) {
  const router = useRouter();
  const calibration = useStoredCalibration();
  const [stage, setStage] = useState(0);
  const [filter, setFilter] = useState<StanceFilter>("all");
  const [launchingWorld, setLaunchingWorld] = useState<WorldId>();

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 180),
      window.setTimeout(() => setStage(2), 760),
      window.setTimeout(() => setStage(3), 1380)
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  const visibleCards = useMemo(
    () =>
      sourceCards.filter((card) => filter === "all" || card.stance === filter),
    [filter, sourceCards]
  );

  function enterWorld(worldId: WorldId) {
    if (!calibration) return;
    setLaunchingWorld(worldId);
    const session = selectWorld(
      createSession(calibration, scenario),
      scenario,
      worldId
    );
    saveSession(window.localStorage, session);
    router.push(`/play/${session.id}`);
  }

  const stanceCounts = Object.fromEntries(
    (["support", "oppose", "conditional"] as const).map((stance) => [
      stance,
      sourceCards.filter((card) => card.stance === stance).length
    ])
  ) as Record<SourceCard["stance"], number>;

  return (
    <PageFrame
      actions={
        <Button asChild size="sm" variant="ghost">
          <Link href="/calibrate">
            <ArrowLeft aria-hidden="true" />
            返回校准
          </Link>
        </Button>
      }
      description="熔炉不会替你搜一个答案。它把相互冲突的社区经验拆成条件、后果与适用边界，再送进同一局推演。"
      eyebrow="02 / EVIDENCE FORGE"
      step={2}
      title="让相反经验，在同一组事实里碰撞。"
    >
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="glass-panel h-fit rounded-3xl border border-white/10 p-5 sm:p-7 xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
                编译管线
              </p>
              <h2 className="mt-2 text-xl font-semibold">证据已通过人工筛选</h2>
            </div>
            <span className="border-signal-lime/20 bg-signal-lime/10 text-signal-lime rounded-full border px-2.5 py-1 text-[11px]">
              {stage === 3 ? "编译完成" : "编译中"}
            </span>
          </div>

          <div className="mt-7 space-y-3" aria-live="polite">
            {forgeSteps.map((step, index) => {
              const complete = stage > index;
              const active = stage === index;
              return (
                <div
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border p-4 transition-colors",
                    complete
                      ? "border-zhihu/20 bg-zhihu/[0.07]"
                      : "border-white/[0.07] bg-white/[0.025]"
                  )}
                  key={step.label}
                >
                  <span className="bg-zhihu/10 flex size-10 shrink-0 items-center justify-center rounded-xl text-blue-300">
                    <step.icon aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      {step.label}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      {step.detail}
                    </p>
                  </div>
                  <span className="text-muted-foreground flex size-6 items-center justify-center rounded-full border border-white/10 text-[10px]">
                    {complete ? (
                      <Check
                        aria-hidden="true"
                        className="text-signal-lime size-3"
                      />
                    ) : active ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-3 animate-spin"
                      />
                    ) : (
                      index + 1
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-zhihu/15 bg-zhihu/[0.06] mt-6 rounded-2xl border p-4 text-xs leading-5 text-blue-100/75">
            本场景证据于 {evidenceRetrievedAt} 由知乎官方 API
            获取。当前使用人工审核后的缓存，不谎称实时检索。
          </div>

          {!calibration ? (
            <div className="border-world-leap/20 bg-world-leap/[0.06] mt-4 rounded-2xl border p-4">
              <p className="text-sm font-medium text-white">尚未找到完整校准</p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                先回答五个约束问题，才能生成属于你的世界初始状态。
              </p>
              <Button asChild className="mt-3" size="sm" variant="outline">
                <Link href="/calibrate">返回完成校准</Link>
              </Button>
            </div>
          ) : null}
        </section>

        <div
          className={cn(
            "space-y-8 transition-opacity duration-500",
            stage === 3 ? "opacity-100" : "pointer-events-none opacity-35"
          )}
        >
          <section aria-labelledby="evidence-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-blue-200 uppercase">
                  <ShieldCheck aria-hidden="true" className="size-4" />
                  {sourceCards.length} VERIFIED SOURCES
                </div>
                <h2 className="mt-2 text-2xl font-semibold" id="evidence-title">
                  同一问题，没有单一答案。
                </h2>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="按观点筛选">
                {(["all", "support", "oppose", "conditional"] as const).map(
                  (stance) => (
                    <button
                      aria-pressed={filter === stance}
                      className={cn(
                        "min-h-9 rounded-full border px-3 text-xs transition-colors",
                        filter === stance
                          ? "border-zhihu/40 bg-zhihu/15 text-white"
                          : "border-white/10 text-white/55 hover:text-white"
                      )}
                      key={stance}
                      onClick={() => setFilter(stance)}
                      type="button"
                    >
                      {stance === "all"
                        ? `全部 ${sourceCards.length}`
                        : `${stanceMeta[stance].label} ${stanceCounts[stance]}`}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {visibleCards.map((card) => {
                const stance = stanceMeta[card.stance];
                return (
                  <article
                    className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5"
                    key={card.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px]",
                          stance.className
                        )}
                      >
                        {stance.label}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        赞同 {card.voteUpCount}
                      </span>
                    </div>
                    <h3 className="mt-4 line-clamp-2 text-base leading-6 font-semibold text-white">
                      {card.title}
                    </h3>
                    <p className="text-muted-foreground mt-3 text-sm leading-6">
                      {card.claim}
                    </p>
                    <div className="mt-4 rounded-2xl bg-black/15 p-3">
                      <p className="text-[10px] font-medium tracking-[0.14em] text-white/40 uppercase">
                        适用条件
                      </p>
                      <p className="mt-1.5 text-xs leading-5 text-white/65">
                        {card.conditions[0]}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                      <span className="text-muted-foreground truncate text-xs">
                        {card.author} ·{" "}
                        {card.contentType === "Answer" ? "回答" : "文章"}
                      </span>
                      <a
                        className="hover:text-zhihu inline-flex shrink-0 items-center gap-1 text-xs text-blue-200 transition-colors"
                        href={card.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        查看原文
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section
            aria-labelledby="world-title"
            className="border-t border-white/[0.08] pt-8"
          >
            <div className="flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-blue-200 uppercase">
              <Sparkles aria-hidden="true" className="size-4" />
              CHOOSE A WORLD TO LIVE
            </div>
            <h2 className="mt-2 text-2xl font-semibold" id="world-title">
              证据相同，承诺不同。你先活哪一条？
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              这不是系统推荐。你选择的是想先承受哪组代价，另外两条路仍会以“分岔回声”出现。
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {scenario.worlds.map((world, worldIndex) => {
                const meta = worldMeta[world.id] ?? {
                  code: String.fromCharCode(65 + worldIndex),
                  ...fallbackWorldMeta[worldIndex % fallbackWorldMeta.length]
                };
                return (
                  <article
                    className={cn(
                      "group flex min-h-72 flex-col rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 transition-colors",
                      meta.glow
                    )}
                    key={world.id}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "font-mono text-2xl font-semibold",
                          meta.className
                        )}
                      >
                        {meta.code}
                      </span>
                      <span className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
                        3 ACTS
                      </span>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-white">
                      {world.name}
                    </h3>
                    <p className={cn("mt-1 text-sm", meta.className)}>
                      {world.tagline}
                    </p>
                    <p className="text-muted-foreground mt-4 flex-1 text-xs leading-5">
                      {world.startingPoint}
                    </p>
                    <Button
                      className="mt-5 w-full"
                      disabled={!calibration || Boolean(launchingWorld)}
                      onClick={() => enterWorld(world.id)}
                      variant="outline"
                    >
                      {launchingWorld === world.id
                        ? "正在建立世界…"
                        : `进入${world.name}`}
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  </article>
                );
              })}
            </div>
          </section>

          <p className="text-muted-foreground flex items-center gap-2 text-xs leading-5">
            <BookOpenText aria-hidden="true" className="size-4 shrink-0" />
            知乎内容仅作为社区经验样本；数值用于展示结构性代价，不代表成功率或职业建议。
          </p>
        </div>
      </div>
    </PageFrame>
  );
}
