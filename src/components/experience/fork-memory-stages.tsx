import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FastForward,
  GitFork,
  HelpCircle,
  ScanLine,
  ShieldAlert,
  Sparkles
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  AssumptionCheckResult,
  OutcomeTemplates,
  Scene,
  SourceCard,
  World,
  WorldId
} from "@/features/game";
import { cn } from "@/lib/utils";

const worldColors: Record<WorldId, string> = {
  stay: "border-world-stay/30 bg-world-stay/[0.06] text-world-stay",
  leap: "border-world-leap/30 bg-world-leap/[0.06] text-world-leap",
  bridge: "border-world-bridge/30 bg-world-bridge/[0.06] text-world-bridge"
};

export function BranchEchoStage({
  currentWorld,
  onContinue,
  scene,
  sourceCards,
  worlds,
  nextLabel
}: {
  currentWorld: World;
  onContinue: () => void;
  scene: Scene;
  sourceCards: SourceCard[];
  worlds: World[];
  nextLabel: string;
}) {
  const echoes = Object.entries(scene.echoes).map(([worldId, echo]) => ({
    echo,
    world: worlds.find((candidate) => candidate.id === worldId)!
  }));

  return (
    <section
      aria-labelledby="branch-echo-title"
      className="fork-stage mt-7 overflow-hidden rounded-3xl border border-white/[0.09] bg-black/20 p-4 sm:p-6"
    >
      <div className="fork-stage__scan" />
      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-violet-200 uppercase">
              <GitFork aria-hidden="true" className="size-4" />
              另外两条路 · {scene.timeLabel}
            </p>
            <h3 className="mt-2 text-lg font-semibold" id="branch-echo-title">
              如果选了另外两条路呢？
            </h3>
            <p className="text-muted-foreground mt-2 max-w-2xl text-xs leading-5">
              这不是预测。我们只是把同一批知乎经历放进另外两种选择，看看各自会遇到什么。
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] text-white/55">
            当前世界 · {currentWorld.name}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {echoes.map(({ echo, world }, index) => {
            const sources = echo.sourceIds
              .map((id) => sourceCards.find((card) => card.id === id))
              .filter((card): card is SourceCard => Boolean(card));
            return (
              <article
                className={cn(
                  "echo-card rounded-2xl border p-4",
                  worldColors[world.id]
                )}
                key={world.id}
                style={{ animationDelay: `${120 + index * 150}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">
                    未选择 · {world.name}
                  </span>
                  <Eye aria-hidden="true" className="size-4 opacity-70" />
                </div>
                <h4 className="mt-3 text-sm font-semibold text-white">
                  {echo.title}
                </h4>
                <p className="mt-2 text-xs leading-6 text-white/65">
                  {echo.text}
                </p>
                <p className="mt-3 border-t border-white/[0.08] pt-3 text-[10px] leading-4 text-white/45">
                  参考经历：{sources.map((source) => source.author).join(" · ")}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-end">
          <Button onClick={onContinue} variant="ghost">
            <FastForward aria-hidden="true" />
            直接下一步
          </Button>
          <Button onClick={onContinue} size="lg">
            {nextLabel}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export function AssumptionCheckStage({
  assumption,
  check,
  onContinue,
  skipAnimation,
  worldId
}: {
  assumption: OutcomeTemplates["assumptionBlasts"][number];
  check: AssumptionCheckResult;
  onContinue: () => void;
  skipAnimation: boolean;
  worldId: WorldId;
}) {
  const resultCopy = {
    supported: {
      icon: CheckCircle2,
      eyebrow: "这次有证据支持",
      title: "这件事目前站得住",
      border: "border-signal-lime/25",
      background: "bg-signal-lime/[0.045]",
      iconColor: "text-signal-lime"
    },
    contradicted: {
      icon: ShieldAlert,
      eyebrow: "这次发现不对",
      title: "事情和想的不一样",
      border: "border-world-leap/25",
      background: "bg-world-leap/[0.045]",
      iconColor: "text-world-leap"
    },
    inconclusive: {
      icon: HelpCircle,
      eyebrow: "现在还查不清",
      title: "证据还不够",
      border: "border-blue-300/25",
      background: "bg-blue-300/[0.045]",
      iconColor: "text-blue-200"
    }
  }[check.result];
  const ResultIcon = resultCopy.icon;
  const checkedFact =
    check.result === "contradicted"
      ? [...assumption.addedFactsByWorld[worldId], check.outcome.fact].join(
          "；"
        )
      : check.outcome.fact;
  const stages = [
    { icon: ShieldAlert, label: "你原来以为", text: assumption.premise },
    {
      icon: ScanLine,
      label: "这次查到",
      text: checkedFact
    },
    { icon: Sparkles, label: "接下来会怎样", text: check.narrative }
  ];

  return (
    <section
      aria-labelledby="assumption-check-title"
      aria-live="polite"
      className={cn(
        "assumption-stage mt-7 overflow-hidden rounded-3xl border p-4 sm:p-6",
        resultCopy.border,
        resultCopy.background,
        skipAnimation && "assumption-stage--static"
      )}
    >
      <div className="assumption-stage__pulse" />
      <div className="relative">
        <p
          className={cn(
            "flex items-center gap-2 text-xs font-medium tracking-[0.16em] uppercase",
            resultCopy.iconColor
          )}
        >
          <ResultIcon aria-hidden="true" className="size-4" />
          {resultCopy.eyebrow}
        </p>
        <h2 className="mt-3 text-xl font-semibold" id="assumption-check-title">
          {resultCopy.title}
        </h2>
        <div className="mt-5 grid gap-3">
          {stages.map((stage, index) => (
            <div
              className="assumption-beat grid gap-2 rounded-2xl border border-white/[0.08] bg-black/15 p-4 sm:grid-cols-[7rem_1fr]"
              key={stage.label}
              style={{ animationDelay: `${index * 260}ms` }}
            >
              <p className="flex items-center gap-2 text-xs font-medium text-white/75">
                <stage.icon
                  aria-hidden="true"
                  className={cn("size-4", resultCopy.iconColor)}
                />
                {stage.label}
              </p>
              <p className="text-muted-foreground text-xs leading-6">
                {stage.text}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
          <Button onClick={onContinue} variant="ghost">
            <FastForward aria-hidden="true" />
            直接看结果
          </Button>
          <Button onClick={onContinue} size="lg">
            继续下一步
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
