"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  FastForward,
  FlaskConical,
  History,
  Radio,
  RefreshCw,
  ShieldAlert
} from "lucide-react";

import { PageFrame } from "@/components/experience/page-frame";
import {
  AssumptionCheckStage,
  BranchEchoStage
} from "@/components/experience/fork-memory-stages";
import { UniverseRail } from "@/components/experience/universe-rail";
import { Button } from "@/components/ui/button";
import {
  STATE_KEYS,
  applyAction,
  applyAssumptionCheck,
  getCurrentScene,
  saveSession,
  type AssumptionCheckResult,
  type OutcomeTemplates,
  type Scenario,
  type SourceCard,
  type StateVector,
  type TurnResult,
  type WorldId
} from "@/features/game";
import { useStoredSession } from "@/features/game/use-stored-session";
import { cn } from "@/lib/utils";

const worldStyles: Record<
  WorldId,
  { badge: string; border: string; hover: string }
> = {
  stay: {
    badge: "border-world-stay/25 bg-world-stay/10 text-world-stay",
    border: "border-world-stay/60",
    hover: "hover:border-world-stay/35 hover:bg-world-stay/[0.07]"
  },
  leap: {
    badge: "border-world-leap/25 bg-world-leap/10 text-world-leap",
    border: "border-world-leap/60",
    hover: "hover:border-world-leap/35 hover:bg-world-leap/[0.07]"
  },
  bridge: {
    badge: "border-world-bridge/25 bg-world-bridge/10 text-world-bridge",
    border: "border-world-bridge/60",
    hover: "hover:border-world-bridge/35 hover:bg-world-bridge/[0.07]"
  }
};

const fallbackWorldStyle = worldStyles.bridge;

function EvidenceMiniCard({ card }: { card: SourceCard }) {
  return (
    <article className="surface-lift rounded-2xl border border-white/[0.07] bg-black/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium tracking-[0.12em] text-blue-200 uppercase">
          知乎经验样本
        </span>
        <span className="text-muted-foreground text-[10px]">
          {card.contentType === "Answer" ? "回答" : "文章"}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-xs leading-5 font-medium text-white">
        {card.title}
      </h3>
      <p className="text-muted-foreground mt-2 line-clamp-3 text-xs leading-5">
        {card.claim}
      </p>
      <a
        className="hover:text-zhihu mt-3 inline-flex items-center gap-1 text-xs text-blue-200"
        href={card.url}
        rel="noreferrer"
        target="_blank"
      >
        查看原文
        <ExternalLink aria-hidden="true" className="size-3" />
      </a>
    </article>
  );
}

function StatePanel({
  state,
  before,
  reason,
  dimensions
}: {
  state: StateVector;
  before?: StateVector;
  reason?: { title: string; text: string };
  dimensions: Scenario["stateModel"]["dimensions"];
}) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          <Radio aria-hidden="true" className="size-4 text-blue-300" />
          现在的状态
        </p>
        <span className="text-muted-foreground text-[10px]">
          选择后自动更新
        </span>
      </div>
      {reason ? (
        <div className="scene-swap mt-5 rounded-2xl border border-blue-300/15 bg-blue-300/[0.05] p-4">
          <p className="text-[10px] font-medium tracking-[0.14em] text-blue-200 uppercase">
            为什么会变
          </p>
          <p className="mt-2 text-xs font-medium text-white">{reason.title}</p>
          <p className="text-muted-foreground mt-1.5 text-xs leading-5">
            {reason.text}
          </p>
        </div>
      ) : null}
      <p className="text-muted-foreground mt-5 text-[10px] font-medium tracking-[0.14em] uppercase">
        {reason ? "状态变化" : "当前状态"}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {STATE_KEYS.map((key) => {
          const delta = before ? state[key] - before[key] : 0;
          const isRisk = dimensions[key]?.higherIsBetter
            ? delta < 0
            : delta > 0;
          return (
            <div
              className="rounded-xl border border-white/[0.06] bg-black/10 p-3"
              key={key}
            >
              <p className="text-muted-foreground text-[10px]">
                {dimensions[key]?.label ?? key}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-lg font-semibold tabular-nums">
                  {state[key]}
                </p>
                {delta !== 0 ? (
                  <span
                    className={cn(
                      "state-change font-mono text-[10px]",
                      isRisk ? "text-world-leap" : "text-signal-lime"
                    )}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlayExperience({
  outcomes,
  scenario,
  sessionId,
  sourceCards
}: {
  outcomes: OutcomeTemplates;
  scenario: Scenario;
  sessionId: string;
  sourceCards: SourceCard[];
}) {
  const router = useRouter();
  const stored = useStoredSession(sessionId);
  const session = stored.session;
  const [turn, setTurn] = useState<TurnResult>();
  const [assumptionCheck, setAssumptionCheck] =
    useState<AssumptionCheckResult>();
  const [selectedAssumptionId, setSelectedAssumptionId] = useState<string>();
  const [skipStageAnimation, setSkipStageAnimation] = useState(false);
  const [error, setError] = useState<string>();

  const world = session?.selectedWorld
    ? scenario.worlds.find(
        (candidate) => candidate.id === session.selectedWorld
      )
    : undefined;
  const scene =
    session?.status === "playing" && world
      ? getCurrentScene(session, scenario)
      : undefined;
  const activeSources = useMemo(() => {
    const ids = turn?.action.sourceIds ?? scene?.sourceIds ?? [];
    return ids
      .map((id) => sourceCards.find((card) => card.id === id))
      .filter((card): card is SourceCard => Boolean(card))
      .slice(0, 2);
  }, [scene?.sourceIds, sourceCards, turn?.action.sourceIds]);

  function chooseAction(actionId: string) {
    if (!session) return;
    try {
      const result = applyAction(session, scenario, actionId);
      saveSession(window.localStorage, result.session);
      setTurn(result);
      setError(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "行动未能写入，请重试。"
      );
    }
  }

  function selectAssumption(assumptionId: string) {
    setSelectedAssumptionId(assumptionId);
    setError(undefined);
  }

  function checkAssumption(evidenceOptionId: string) {
    if (!session || !selectedAssumptionId) return;
    try {
      const result = applyAssumptionCheck(
        session,
        outcomes,
        selectedAssumptionId,
        evidenceOptionId
      );
      saveSession(window.localStorage, result.session);
      setAssumptionCheck(result);
      setSelectedAssumptionId(undefined);
      setError(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "这项判断没有更新成功，请重试。"
      );
    }
  }

  if (!stored.hydrated) {
    return (
      <PageFrame
        description="正在从匿名本地存档恢复状态、账本与当前幕。"
        eyebrow="03 / RESTORING SESSION"
        step={3}
        title="正在把你送回分岔点…"
      >
        <div className="glass-panel flex min-h-80 items-center justify-center rounded-3xl border border-white/10">
          <RefreshCw
            aria-hidden="true"
            className="size-6 animate-spin text-blue-300"
          />
        </div>
      </PageFrame>
    );
  }

  if (!session || !world || session.scenarioId !== scenario.scenarioId) {
    return (
      <PageFrame
        description="这个链接没有对应的匿名本地存档。会话只保存在创建它的浏览器中。"
        eyebrow="03 / SESSION NOT FOUND"
        step={3}
        title="这条世界线还没有被创建。"
      >
        <div className="glass-panel rounded-3xl border border-white/10 p-8 text-center sm:p-12">
          <History
            aria-hidden="true"
            className="mx-auto size-8 text-white/25"
          />
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-sm leading-6">
            返回证据熔炉选择一个世界，系统会创建新的匿名 session
            ID。旧链接不会被伪造成有效存档。
          </p>
          <Button asChild className="mt-6">
            <Link href="/forge">返回证据熔炉</Link>
          </Button>
        </div>
      </PageFrame>
    );
  }

  const style = worldStyles[world.id] ?? fallbackWorldStyle;
  const selectedAssumption = selectedAssumptionId
    ? outcomes.assumptionBlasts.find(
        (assumption) => assumption.id === selectedAssumptionId
      )
    : undefined;
  const isAssumptionGate =
    session.status === "playing" &&
    session.act === 3 &&
    !session.blastedAssumptionId;
  const stateBefore = turn?.stateBefore ?? assumptionCheck?.stateBefore;
  const checkedAssumption = assumptionCheck
    ? outcomes.assumptionBlasts.find(
        (assumption) => assumption.id === assumptionCheck.assumptionId
      )
    : undefined;
  const stateReason = turn
    ? {
        title: turn.action.label,
        text: `你拿到了“${turn.action.benefits[0]}”，但也要付出“${turn.action.costs[0]}”。`
      }
    : assumptionCheck && checkedAssumption
      ? {
          title: assumptionCheck.outcome.label,
          text: assumptionCheck.narrative
        }
      : undefined;
  const title = turn
    ? `${turn.scene.timeLabel}：看看这一步发生了什么`
    : assumptionCheck
      ? assumptionCheck.result === "supported"
        ? "这次有证据支持"
        : assumptionCheck.result === "inconclusive"
          ? "现在还查不清"
          : "事情和想的不一样"
      : session.status === "completed"
        ? "三幕结束，代价已经写进账本。"
        : `${scene?.timeLabel}：${scene?.sceneTitle}`;

  return (
    <PageFrame
      actions={
        <Button asChild size="sm" variant="ghost">
          <Link href="/forge">
            <ArrowLeft aria-hidden="true" />
            返回熔炉
          </Link>
        </Button>
      }
      description="你每选一次，状态就会跟着变。数字按固定规则算，故事是提前写好的。"
      eyebrow={`03 / ${world.name.toUpperCase()} / SESSION ${sessionId.slice(0, 8).toUpperCase()}`}
      step={3}
      title={title}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_18rem_minmax(17rem,0.75fr)]">
        <section
          className="glass-panel scene-swap rounded-3xl border border-white/10 p-5 sm:p-7"
          key={
            turn?.action.id ??
            assumptionCheck?.assumptionId ??
            `${session.status}-${scene?.id ?? "complete"}`
          }
        >
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded-full border px-3 py-1", style.badge)}>
              {world.name}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/[0.07] px-3 py-1">
              <Clock3 aria-hidden="true" className="size-3" />
              {session.status === "completed"
                ? "已完成三幕"
                : `第 ${session.act} 幕 / 3`}
            </span>
            <span className="rounded-full border border-white/[0.07] px-3 py-1">
              已记录 {session.actionHistory.length} 个行动
            </span>
            <span className="border-signal-lime/20 bg-signal-lime/[0.05] text-signal-lime rounded-full border px-3 py-1">
              本地存档已同步
            </span>
          </div>

          {turn ? (
            <div className="mt-7">
              <div className={cn("border-l-2 pl-5", style.border)}>
                <p className="text-xs font-medium tracking-[0.15em] text-blue-200 uppercase">
                  这一步的结果
                </p>
                <h2 className="mt-3 text-xl font-semibold">
                  {turn.action.label}
                </h2>
                <p className="text-muted-foreground mt-4 text-sm leading-7">
                  {turn.action.fallbackOutcome}
                </p>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="border-signal-lime/15 bg-signal-lime/[0.05] rounded-2xl border p-4">
                  <p className="text-signal-lime text-xs font-medium">得到</p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-white/70">
                    {turn.action.benefits.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="border-world-leap/15 bg-world-leap/[0.05] rounded-2xl border p-4">
                  <p className="text-world-leap text-xs font-medium">付出</p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-white/70">
                    {turn.action.costs.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <BranchEchoStage
                currentWorld={world}
                nextLabel={
                  turn.session.status === "completed"
                    ? "生成代价报告"
                    : `进入第 ${turn.session.act} 幕`
                }
                onContinue={() => {
                  if (turn.session.status === "completed")
                    router.push(`/result/${sessionId}`);
                  else setTurn(undefined);
                }}
                scene={turn.scene}
                sourceCards={sourceCards}
                worlds={scenario.worlds}
              />
            </div>
          ) : assumptionCheck && checkedAssumption ? (
            <AssumptionCheckStage
              assumption={checkedAssumption}
              check={assumptionCheck}
              onContinue={() => setAssumptionCheck(undefined)}
              skipAnimation={skipStageAnimation}
              worldId={world.id}
            />
          ) : session.status === "completed" ? (
            <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 p-6 text-center">
              <CheckCircle2
                aria-hidden="true"
                className="text-signal-lime size-10"
              />
              <h2 className="mt-4 text-xl font-semibold">
                本地存档已恢复到完成状态
              </h2>
              <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
                三次选择和最后一次判断都已保留，可以直接看结果。
              </p>
              <Button
                className="mt-6"
                onClick={() => router.push(`/result/${sessionId}`)}
              >
                进入代价报告
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          ) : isAssumptionGate ? (
            <div className="mt-7">
              <div className="flex items-start gap-4">
                <span className="bg-world-leap/10 text-world-leap flex size-11 shrink-0 items-center justify-center rounded-2xl">
                  <ShieldAlert aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-world-leap text-xs font-medium tracking-[0.15em] uppercase">
                    最后一个问题
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    你最相信的事，先查一查
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    先看线索，再决定这件事目前算不算数。
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button
                  aria-pressed={skipStageAnimation}
                  onClick={() => setSkipStageAnimation((value) => !value)}
                  size="sm"
                  variant="ghost"
                >
                  <FastForward aria-hidden="true" />
                  {skipStageAnimation ? "已直接显示" : "直接显示"}
                </Button>
              </div>
              {selectedAssumption ? (
                <div className="mt-6 rounded-3xl border border-white/[0.08] bg-black/15 p-4 sm:p-5">
                  <p className="text-muted-foreground text-xs tracking-[0.14em] uppercase">
                    你要查的是
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {selectedAssumption.label}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {selectedAssumption.checkQuestion}
                  </p>
                  <div className="mt-5 grid gap-3">
                    {selectedAssumption.evidenceOptions.map((option) => (
                      <button
                        className="surface-lift hover:border-world-leap/35 hover:bg-world-leap/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left"
                        key={option.id}
                        onClick={() => checkAssumption(option.id)}
                        type="button"
                      >
                        <span className="block text-sm font-medium text-white">
                          {option.label}
                        </span>
                        <span className="text-muted-foreground mt-1.5 block text-xs leading-5">
                          {option.detail}
                        </span>
                      </button>
                    ))}
                  </div>
                  <Button
                    className="mt-4"
                    onClick={() => setSelectedAssumptionId(undefined)}
                    size="sm"
                    variant="ghost"
                  >
                    换一个判断
                  </Button>
                </div>
              ) : (
                <div className="mt-6 grid gap-3">
                  {outcomes.assumptionBlasts.map((assumption) => (
                    <button
                      className="surface-lift hover:border-world-leap/35 hover:bg-world-leap/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left"
                      key={assumption.id}
                      onClick={() => selectAssumption(assumption.id)}
                      type="button"
                    >
                      <span className="text-sm font-medium text-white">
                        {assumption.label}
                      </span>
                      <span className="text-muted-foreground mt-1.5 block text-xs leading-5">
                        {assumption.premise}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : scene ? (
            <div className="mt-7">
              <div className={cn("border-l-2 pl-5", style.border)}>
                <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
                  Scene 0{scene.act} / {scene.timeLabel}
                </p>
                <h2 className="mt-3 text-xl leading-snug font-semibold sm:text-2xl">
                  {scene.sceneTitle}
                </h2>
                <p className="text-muted-foreground mt-4 text-sm leading-7">
                  {scene.setup}
                </p>
              </div>
              <div className="mt-8 space-y-3">
                <p className="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
                  你准备怎么做？
                </p>
                {scene.actions.map((action, index) => (
                  <button
                    className={cn(
                      "surface-lift group flex w-full items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left transition-colors",
                      style.hover
                    )}
                    key={action.id}
                    onClick={() => chooseAction(action.id)}
                    type="button"
                  >
                    <span className="text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/15 text-xs group-hover:text-white">
                      0{index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-white">
                        {action.label}
                      </span>
                      <span className="text-muted-foreground mt-1.5 block text-xs leading-5">
                        {action.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <p
              className="border-world-leap/20 bg-world-leap/[0.06] text-world-leap mt-5 rounded-xl border p-3 text-xs"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </section>

        <div className="space-y-5">
          <UniverseRail
            activeWorld={world.id}
            act={session.act}
            worlds={scenario.worlds}
          />
          <details className="rounded-3xl border border-white/[0.08] bg-black/15 p-5">
            <summary className="cursor-pointer text-sm font-medium text-white">
              已经做出的承诺 ·{" "}
              {session.ledger.commitments.length +
                session.ledger.irreversibleEvents.length}
            </summary>
            <div className="text-muted-foreground mt-4 space-y-4 text-xs leading-5">
              <div>
                <p className="text-white/60">已经答应的事</p>
                <ul className="mt-1">
                  {session.ledger.commitments.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-white/60">已经无法撤回的事</p>
                <ul className="mt-1">
                  {session.ledger.irreversibleEvents.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        </div>

        <aside className="space-y-5">
          <StatePanel
            before={stateBefore}
            dimensions={scenario.stateModel.dimensions}
            reason={stateReason}
            state={session.state}
          />
          <details
            className="evidence-drawer rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5"
            open
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <BookOpenText
                  aria-hidden="true"
                  className="size-4 text-blue-300"
                />
                为什么会发生
              </span>
              <span className="text-muted-foreground flex items-center gap-2 text-[10px]">
                {activeSources.length} 条证据
                <ChevronDown
                  aria-hidden="true"
                  className="evidence-drawer__chevron size-3.5 transition-transform"
                />
              </span>
            </summary>
            <div className="evidence-drawer__content mt-4 space-y-3">
              {activeSources.map((card) => (
                <EvidenceMiniCard card={card} key={card.id} />
              ))}
              <p className="text-muted-foreground pt-1 text-[10px] leading-4">
                这些知乎经历只帮你看条件和风险，不代表你也会这样。
              </p>
            </div>
          </details>
          <div className="border-zhihu/15 bg-zhihu/[0.05] text-muted-foreground flex items-start gap-2 rounded-2xl border p-4 text-xs leading-5">
            <FlaskConical
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-blue-300"
            />
            所有计算都在本地完成，断网也能继续玩。
          </div>
        </aside>
      </div>
    </PageFrame>
  );
}
