"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  ArrowLeft,
  ArrowRight,
  Banknote,
  BookOpenText,
  Check,
  CalendarDays,
  CircleHelp,
  Clipboard,
  Clock3,
  ExternalLink,
  FlaskConical,
  Mail,
  Minus,
  Plus,
  RotateCcw,
  ShieldAlert,
  Target,
  Trash2,
  Download
} from "lucide-react";

import { OutcomeRadar } from "@/components/experience/outcome-radar";
import { PageFrame } from "@/components/experience/page-frame";
import { ShareResultCard } from "@/components/experience/share-result-card";
import { Button } from "@/components/ui/button";
import {
  STATE_KEYS,
  DEMO_SESSION_ID,
  GRADUATE_DEMO_SESSION_ID,
  acceptExperimentAdjustment,
  advanceExperiment,
  buildExperimentExport,
  buildOutcomeText,
  calculateOutcome,
  customizeExperimentAdjustment,
  deleteSession,
  forkSession,
  getExperimentAdjustment,
  getExperimentAvailability,
  getExperimentDays,
  recordExperimentFeedback,
  revertExperimentAdjustment,
  rescheduleExperiment,
  saveSession,
  skipExperimentDay,
  startExperiment,
  stopExperiment,
  type EvidenceType,
  type EvidenceSignal,
  type ExperimentBlocker,
  type Feeling,
  type ExperimentFeedback,
  type OutcomeTemplates,
  type Scenario,
  type ShareCardData,
  type SourceCard
} from "@/features/game";
import { useStoredSession } from "@/features/game/use-stored-session";

function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(5);
}

const evidenceSignalLabels: Record<EvidenceSignal, string> = {
  supported: "更支持原假设",
  contradicted: "和原假设冲突",
  insufficient: "信息还不够"
};

const blockerLabels: Record<ExperimentBlocker, string> = {
  no_response: "对方没有回复",
  missing_material: "材料拿不到",
  conditions_changed: "条件突然变化",
  time_or_cost: "时间或成本超标",
  other: "其他阻碍"
};

export function ResultPreview({
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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [experimentError, setExperimentError] = useState<string>();
  const [counterfactualError, setCounterfactualError] = useState<string>();
  const [pendingChoice, setPendingChoice] = useState<string>();
  const [pendingNote, setPendingNote] = useState("");
  const [pendingEvidenceType, setPendingEvidenceType] =
    useState<EvidenceType>("document");
  const [pendingFeeling, setPendingFeeling] = useState<Feeling>("steady");
  const [pendingEvidenceSignal, setPendingEvidenceSignal] =
    useState<EvidenceSignal>("insufficient");
  const [pendingBlocker, setPendingBlocker] = useState<ExperimentBlocker | "">(
    ""
  );
  const [pendingNextStep, setPendingNextStep] = useState("");
  const [customAdjustmentAction, setCustomAdjustmentAction] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [stopReason, setStopReason] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewWorldId, setPreviewWorldId] = useState<string>();

  if (!stored.hydrated) {
    return (
      <PageFrame
        description="正在读取匿名本地账本。"
        eyebrow="04 / RESTORING OUTCOME"
        step={4}
        title="正在展开代价地图…"
      >
        <div className="glass-panel min-h-80 animate-pulse rounded-3xl border border-white/10" />
      </PageFrame>
    );
  }

  if (!session || session.status !== "completed" || !session.selectedWorld) {
    return (
      <PageFrame
        description="结果只能由完成三幕的本地会话生成，不会根据 URL 伪造。"
        eyebrow="04 / OUTCOME NOT READY"
        step={4}
        title="这条人生还没有走到结尾。"
      >
        <div className="glass-panel rounded-3xl border border-white/10 p-8 text-center">
          <Button asChild>
            <Link href={`/play/${sessionId}`}>
              <ArrowLeft aria-hidden="true" />
              返回继续推演
            </Link>
          </Button>
        </div>
      </PageFrame>
    );
  }

  const world = scenario.worlds.find(
    (candidate) => candidate.id === session.selectedWorld
  )!;
  const completedSession = session;
  const comparison = calculateOutcome(session, scenario, outcomes);
  const activePreviewWorldId = previewWorldId ?? session.selectedWorld;
  const previewWorld = scenario.worlds.find(
    (candidate) => candidate.id === activePreviewWorldId
  )!;
  const previewOutcome = comparison.worlds.find(
    (candidate) => candidate.worldId === activePreviewWorldId
  )!;
  const exploredOutcome = comparison.worlds.find(
    (candidate) => candidate.worldId === session.selectedWorld
  )!;
  const assumption = outcomes.assumptionBlasts.find(
    (candidate) => candidate.id === session.blastedAssumptionId
  );
  const blindSpots = comparison.blindSpotIds
    .map((id) => outcomes.blindSpots.find((candidate) => candidate.id === id))
    .filter((blindSpot): blindSpot is OutcomeTemplates["blindSpots"][number] =>
      Boolean(blindSpot)
    );
  const futureLetter = outcomes.futureLetters.find(
    (candidate) => candidate.id === comparison.futureLetterId
  )!;
  const experiment = outcomes.sevenDayExperiments.find(
    (candidate) => candidate.id === comparison.experimentId
  )!;
  const experimentRun =
    session.experimentRun?.experimentId === experiment.id
      ? session.experimentRun
      : undefined;
  const experimentDays = getExperimentDays(experiment);
  const experimentEvents = experimentRun?.events ?? [];
  const isDemoSession =
    sessionId === DEMO_SESSION_ID || sessionId === GRADUATE_DEMO_SESSION_ID;
  const demoResetHref =
    sessionId === GRADUATE_DEMO_SESSION_ID
      ? "/demo?scenario=graduate-school"
      : "/demo";
  const experimentAvailability = getExperimentAvailability(
    session,
    experiment.id,
    new Date().toISOString()
  );
  const nextExperimentAdjustment =
    experimentRun?.mode === "real"
      ? getExperimentAdjustment(session, experiment.id, experimentRun.day + 1)
      : undefined;
  const resultMeaning = [
    { key: "supported" as const, label: "证据支持", color: "text-signal-lime" },
    {
      key: "contradicted" as const,
      label: "证据冲突",
      color: "text-world-leap"
    },
    {
      key: "inconclusive" as const,
      label: "暂时不清楚",
      color: "text-world-bridge"
    }
  ];
  const feedbackOptions: Array<{
    key: ExperimentFeedback;
    label: string;
    color: string;
  }> = [
    { key: "supported", label: "证据支持", color: "text-signal-lime" },
    { key: "contradicted", label: "证据冲突", color: "text-world-leap" },
    { key: "inconclusive", label: "暂时不清楚", color: "text-world-bridge" }
  ];
  const allActions = scenario.worlds
    .flatMap((candidate) => candidate.acts)
    .flatMap((scene) => scene.actions);
  const actionById = new Map(allActions.map((action) => [action.id, action]));
  const chosenActions = session.actionHistory
    .map((actionId) => actionById.get(actionId))
    .filter((action): action is (typeof allActions)[number] => Boolean(action));
  const keySourceIds = [
    ...(assumption?.sourceIds ?? []),
    ...blindSpots.flatMap((blindSpot) => blindSpot.sourceIds),
    ...futureLetter.sourceIds,
    ...experiment.sourceIds,
    ...chosenActions.flatMap((action) => action.sourceIds)
  ];
  const keySources = [...new Set(keySourceIds)]
    .map((id) => sourceCards.find((card) => card.id === id))
    .filter((card): card is SourceCard => Boolean(card))
    .slice(0, 5);
  const unknowns = session.ledger.facts
    .slice(-3)
    .map((fact) => `${fact}，能否在下一周期继续成立？`);
  const columns = [
    {
      icon: Plus,
      label: "得到",
      color: "text-signal-lime",
      items: session.ledger.benefits.slice(0, 4)
    },
    {
      icon: Minus,
      label: "失去",
      color: "text-world-leap",
      items: session.ledger.costs.slice(0, 4)
    },
    {
      icon: CircleHelp,
      label: "仍不知道",
      color: "text-world-bridge",
      items: unknowns
    }
  ];
  const resultText = buildOutcomeText({
    assumption,
    blindSpots,
    experiment,
    futureLetter,
    ledger: session.ledger,
    state: session.state,
    world,
    experimentFeedback: experimentRun?.feedback,
    experimentRun,
    dimensions: scenario.stateModel.dimensions
  });
  const assumptionResultLabel =
    session.assumptionResult === "supported"
      ? "证据支持"
      : session.assumptionResult === "contradicted"
        ? "证据冲突"
        : session.assumptionResult === "inconclusive"
          ? "暂时不清楚"
          : "尚未核验";
  const shareCardData: ShareCardData = {
    worldName: world.name,
    worldTagline: world.tagline,
    actionLabels: chosenActions.map((action) => action.label),
    assumptionLabel: assumption
      ? `${assumption.label} · ${assumptionResultLabel}`
      : "暂未记录关键假设",
    experimentTitle: experiment.title,
    experimentQuestion: experiment.question,
    experimentStatus: experimentRun
      ? experimentRun.status === "completed"
        ? "已完成 7 天"
        : `进行中 · 第 ${experimentRun.day} 天`
      : "尚未开始",
    nextStep: experimentRun?.feedback
      ? experiment.nextStep[experimentRun.feedback]
      : `完成七天核验，再决定是否继续加码。`,
    evidenceScore: experimentRun?.evidenceScore ?? 0,
    metrics: [
      {
        label: "当前强项",
        value:
          scenario.stateModel.dimensions[exploredOutcome.dominantStrength]
            ?.label ?? exploredOutcome.dominantStrength
      },
      {
        label: "主要压力",
        value:
          scenario.stateModel.dimensions[exploredOutcome.pressurePoint]
            ?.label ?? exploredOutcome.pressurePoint
      },
      { label: "行动数", value: `${chosenActions.length} 次` },
      { label: "证据进度", value: `${experimentRun?.evidenceScore ?? 0} / 100` }
    ]
  };

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  function saveExperimentSession(nextSession: typeof completedSession) {
    saveSession(window.localStorage, nextSession);
    setExperimentError(undefined);
  }

  function startRealityExperiment() {
    try {
      saveExperimentSession(
        startExperiment(
          completedSession,
          outcomes,
          experiment.id,
          new Date().toISOString(),
          { mode: isDemoSession ? "demo" : "real" }
        )
      );
    } catch (error) {
      setExperimentError(
        error instanceof Error ? error.message : "实验无法开始"
      );
    }
  }

  function fastForwardRealityExperiment() {
    try {
      let nextSession = completedSession;
      if (!nextSession.experimentRun) {
        nextSession = startExperiment(
          nextSession,
          outcomes,
          experiment.id,
          new Date().toISOString(),
          { mode: "demo" }
        );
      }
      while ((nextSession.experimentRun?.day ?? 0) < 7) {
        const nextDay = experimentDays[nextSession.experimentRun?.day ?? 0];
        nextSession = advanceExperiment(
          nextSession,
          outcomes,
          experiment.id,
          new Date().toISOString(),
          {
            choice: nextDay.choices?.[0] ?? nextDay.action,
            note: `演示记录：完成第 ${nextDay.day} 天核验，留下可复核材料。`
          }
        ).session;
      }
      saveExperimentSession(nextSession);
      setPendingChoice(undefined);
      setPendingNote("");
    } catch (error) {
      setExperimentError(
        error instanceof Error ? error.message : "实验无法快速推进"
      );
    }
  }

  function advanceRealityExperiment() {
    try {
      saveExperimentSession(
        advanceExperiment(
          completedSession,
          outcomes,
          experiment.id,
          new Date().toISOString(),
          {
            choice: pendingChoice,
            note: pendingNote,
            evidenceType: pendingEvidenceType,
            feeling: pendingFeeling,
            evidenceSignal: pendingEvidenceSignal,
            ...(pendingBlocker ? { blocker: pendingBlocker } : {}),
            nextStep: pendingNextStep
          }
        ).session
      );
      setPendingChoice(undefined);
      setPendingNote("");
      setPendingNextStep("");
      setPendingEvidenceSignal("insufficient");
      setPendingBlocker("");
    } catch (error) {
      setExperimentError(
        error instanceof Error ? error.message : "实验无法推进"
      );
    }
  }

  function openCounterfactualWorld() {
    if (previewWorld.id === completedSession.selectedWorld) return;
    try {
      const fork = forkSession(completedSession, scenario, previewWorld.id, {
        id: `${completedSession.id}-fork-${previewWorld.id}-${Date.now()}`,
        seed: completedSession.seed + scenario.worlds.indexOf(previewWorld) + 1,
        now: new Date().toISOString()
      });
      saveSession(window.localStorage, fork);
      // The fork is a new local session; leave the report and enter its first act.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/play/${fork.id}`);
    } catch (error) {
      setCounterfactualError(
        error instanceof Error ? error.message : "无法打开另一条世界"
      );
    }
  }

  function chooseExperimentFeedback(feedback: ExperimentFeedback) {
    try {
      saveExperimentSession(
        recordExperimentFeedback(
          completedSession,
          outcomes,
          experiment.id,
          feedback,
          new Date().toISOString()
        )
      );
    } catch (error) {
      setExperimentError(
        error instanceof Error ? error.message : "反馈暂时无法记录"
      );
    }
  }

  function skipToday() {
    try {
      saveExperimentSession(
        skipExperimentDay(
          completedSession,
          outcomes,
          experiment.id,
          new Date().toISOString(),
          pendingNote || "今天无法完成，先跳过并在下一天继续。"
        ).session
      );
      setPendingNote("");
    } catch (error) {
      setExperimentError(
        error instanceof Error ? error.message : "今天暂时无法跳过"
      );
    }
  }

  function rescheduleToday() {
    try {
      saveExperimentSession(
        rescheduleExperiment(
          completedSession,
          experiment.id,
          rescheduleDate,
          new Date().toISOString()
        )
      );
      setRescheduleDate("");
    } catch (error) {
      setExperimentError(
        error instanceof Error ? error.message : "改期没有保存"
      );
    }
  }

  function stopCurrentExperiment() {
    try {
      saveExperimentSession(
        stopExperiment(
          completedSession,
          experiment.id,
          stopReason,
          new Date().toISOString()
        )
      );
    } catch (error) {
      setExperimentError(
        error instanceof Error ? error.message : "请先写下停止原因"
      );
    }
  }

  function acceptTodayAdjustment() {
    if (!nextExperimentAdjustment) return;
    try {
      saveExperimentSession(
        acceptExperimentAdjustment(
          completedSession,
          experiment.id,
          nextExperimentAdjustment.id,
          new Date().toISOString()
        )
      );
      setPendingChoice(nextExperimentAdjustment.recommendedAction);
      setCustomAdjustmentAction("");
    } catch (error) {
      setExperimentError(
        error instanceof Error ? error.message : "调整建议暂时无法采用"
      );
    }
  }

  function customizeTodayAdjustment() {
    if (!nextExperimentAdjustment) return;
    try {
      saveExperimentSession(
        customizeExperimentAdjustment(
          completedSession,
          experiment.id,
          nextExperimentAdjustment.id,
          customAdjustmentAction,
          new Date().toISOString()
        )
      );
      setPendingChoice(customAdjustmentAction.trim());
      setCustomAdjustmentAction("");
    } catch (error) {
      setExperimentError(
        error instanceof Error ? error.message : "请先写下一步要做什么"
      );
    }
  }

  function revertTodayAdjustment() {
    if (!nextExperimentAdjustment) return;
    try {
      saveExperimentSession(
        revertExperimentAdjustment(
          completedSession,
          experiment.id,
          nextExperimentAdjustment.id,
          new Date().toISOString()
        )
      );
      setPendingChoice(undefined);
      setCustomAdjustmentAction("");
    } catch (error) {
      setExperimentError(
        error instanceof Error ? error.message : "这条调整暂时无法撤销"
      );
    }
  }

  function downloadExperimentRecord() {
    const data = buildExperimentExport(completedSession, scenario, outcomes);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `life-fork-experiment-${sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function deleteCurrentSession() {
    deleteSession(window.localStorage, sessionId);
    router.push("/");
  }

  return (
    <PageFrame
      actions={
        <>
          <Button asChild size="sm" variant="ghost">
            <Link href="/archive">
              <Archive aria-hidden="true" />
              决策档案
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={`/play/${sessionId}`}>
              <ArrowLeft aria-hidden="true" />
              返回推演
            </Link>
          </Button>
        </>
      }
      description="不是最佳答案，也不是成功率预测。这张地图把你实际承担的代价与两条未走路径的情景剖面放在同一张纸上。"
      eyebrow={`04 / ${world.name.toUpperCase()} / ${sessionId.slice(0, 8).toUpperCase()}`}
      step={4}
      title={`${world.name}的代价地图。`}
    >
      <section
        aria-labelledby="result-summary-title"
        className="border-zhihu/25 bg-zhihu/[0.045] stage-reveal mb-6 rounded-3xl border p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-zhihu text-xs font-medium tracking-[0.16em] uppercase">
              一眼看懂这次选择
            </p>
            <h2
              className="mt-2 text-2xl font-semibold"
              id="result-summary-title"
            >
              你选择了「{world.name}」
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              这不是系统替你下结论，而是把你做过的选择、已经付出的代价和下一步该查的事实放在一起。
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-xs text-white/65">
            {experimentRun
              ? experimentRun.status === "completed"
                ? "实验已走完 7 天"
                : `实验进行中 · 第 ${experimentRun.day} 天`
              : "实验尚未开始"}
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-black/10 p-4">
            <p className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              你做过的选择
            </p>
            <ol className="mt-3 space-y-2 text-xs leading-5 text-white/80">
              {chosenActions.map((action, index) => (
                <li className="flex gap-2" key={action.id}>
                  <span className="text-zhihu font-mono">0{index + 1}</span>
                  <span>{action.label}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/10 p-4">
            <p className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              这次先查什么
            </p>
            <p className="mt-3 text-sm font-medium text-white/90">
              {assumption?.label ?? "暂未记录关键假设"}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              先做「{experiment.title}」，再决定要不要加码。
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/10 p-4">
            <p className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              下一步怎么走
            </p>
            <p className="mt-3 text-sm font-medium text-white/90">
              {experimentRun?.feedback
                ? experiment.nextStep[experimentRun.feedback]
                : `先做「${experiment.title}」，再决定要不要加码。`}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              证据进度：{experimentRun?.evidenceScore ?? 0} / 100
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="world-preview-title"
        className="glass-panel stage-reveal mb-6 rounded-3xl border border-white/10 p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
              Counterfactual preview
            </p>
            <h2 className="mt-2 text-xl font-semibold" id="world-preview-title">
              另外两条路，现在也能点开看看
            </h2>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              这里是同一组约束下的情景剖面，不是预测。点击卡片，看看如果当时从另一条路开始，第一幕会怎么展开。
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/55">
            原路径不会被改写
          </span>
        </div>
        <div
          className="mt-5 grid gap-3 md:grid-cols-3"
          role="tablist"
          aria-label="选择要预览的世界"
        >
          {scenario.worlds.map((candidate) => {
            const candidateOutcome = comparison.worlds.find(
              (item) => item.worldId === candidate.id
            );
            const selected = candidate.id === activePreviewWorldId;
            const explored = candidate.id === session.selectedWorld;
            return (
              <button
                aria-selected={selected}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-zhihu/50 bg-zhihu/10"
                    : "border-white/[0.08] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]"
                }`}
                key={candidate.id}
                onClick={() => setPreviewWorldId(candidate.id)}
                role="tab"
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{candidate.name}</span>
                  <span className="text-[10px] text-white/45">
                    {explored ? "已走过" : "未走"}
                  </span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  {candidate.tagline}
                </p>
                {candidateOutcome ? (
                  <p className="mt-3 text-[10px] text-white/55">
                    强项：
                    {scenario.stateModel.dimensions[
                      candidateOutcome.dominantStrength
                    ]?.label ?? candidateOutcome.dominantStrength}
                    {" · "}
                    压力：
                    {scenario.stateModel.dimensions[
                      candidateOutcome.pressurePoint
                    ]?.label ?? candidateOutcome.pressurePoint}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
        <div
          aria-labelledby="world-preview-panel-title"
          className="mt-4 rounded-2xl border border-white/[0.08] bg-black/10 p-4 sm:p-5"
          role="tabpanel"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-zhihu text-[10px] font-medium tracking-[0.14em] uppercase">
                {previewWorld.name} ·{" "}
                {previewOutcome.mode === "explored" ? "实际账本" : "情景剖面"}
              </p>
              <h3
                className="mt-2 text-lg font-semibold"
                id="world-preview-panel-title"
              >
                {previewWorld.startingPoint}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-2xl text-xs leading-5">
                {previewWorld.tagline}{" "}
                选择它不会覆盖当前结果；如果想真正走一遍，可以从这条世界重新开始。
              </p>
            </div>
            {previewWorld.id !== session.selectedWorld ? (
              <Button onClick={openCounterfactualWorld} size="sm">
                从这条路重新推演
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STATE_KEYS.map((key) => (
              <div
                className="rounded-xl border border-white/[0.07] px-3 py-2.5"
                key={key}
              >
                <p className="text-muted-foreground text-[10px]">
                  {scenario.stateModel.dimensions[key]?.label ?? key}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {previewOutcome.state[key]}
                </p>
              </div>
            ))}
          </div>
          {counterfactualError ? (
            <p className="text-world-leap mt-3 text-xs" role="alert">
              {counterfactualError}
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <section className="glass-panel stage-reveal min-w-0 rounded-3xl border border-white/10 p-4 sm:p-7">
          <OutcomeRadar comparison={comparison} scenario={scenario} />
        </section>

        <section className="glass-panel stage-reveal stage-delay-1 rounded-3xl border border-white/10 p-5 sm:p-7">
          <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
            Explored world · actual ledger
          </p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">你实际走过的状态</h2>
              <p className="text-muted-foreground mt-1 text-xs">
                3 个选择 · 1 次想法检验
              </p>
            </div>
            <span className="border-zhihu/20 bg-zhihu/10 rounded-full border px-3 py-1 text-xs text-blue-200">
              真实账本
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {STATE_KEYS.map((key) => (
              <div
                className="surface-lift rounded-2xl border border-white/[0.07] bg-black/10 p-3"
                key={key}
              >
                <p className="text-muted-foreground text-[10px]">
                  {scenario.stateModel.dimensions[key]?.label ?? key}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {session.state[key]}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-white/[0.07] p-4">
              <p className="text-muted-foreground text-[10px]">当前强项</p>
              <p className="mt-1 text-sm font-medium">
                {scenario.stateModel.dimensions[
                  exploredOutcome.dominantStrength
                ]?.label ?? exploredOutcome.dominantStrength}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] p-4">
              <p className="text-muted-foreground text-[10px]">主要压力点</p>
              <p className="mt-1 text-sm font-medium">
                {scenario.stateModel.dimensions[exploredOutcome.pressurePoint]
                  ?.label ?? exploredOutcome.pressurePoint}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="ledger-title" className="stage-reveal mt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
              Commitment ledger
            </p>
            <h2 className="mt-2 text-xl font-semibold" id="ledger-title">
              这条路径留下了什么
            </h2>
          </div>
          <p className="text-muted-foreground hidden max-w-sm text-right text-[10px] leading-4 sm:block">
            “仍不知道”不是失败，而是下一步需要用现实购买的信息。
          </p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {columns.map((column) => (
            <article
              className="surface-lift rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5"
              key={column.label}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <column.icon
                  aria-hidden="true"
                  className={`size-4 ${column.color}`}
                />
                {column.label}
              </div>
              <ul className="text-muted-foreground mt-4 space-y-2 text-xs leading-5">
                {column.items.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <div className="stage-reveal mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="border-world-leap/20 bg-world-leap/[0.04] rounded-3xl border p-5 sm:p-6">
          <p className="text-world-leap flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
            <ShieldAlert aria-hidden="true" className="size-4" />
            Assumption impact
          </p>
          <h2 className="mt-3 text-lg font-semibold">
            发现想错了：{assumption?.label ?? "未记录"}
          </h2>
          {assumption ? (
            <>
              <p className="text-muted-foreground mt-3 text-xs leading-6">
                你原来以为：{assumption.premise}
              </p>
              <p className="mt-3 text-sm leading-7 text-white/75">
                {assumption.fallbackNarrativeByWorld[world.id]}
              </p>
              <div className="mt-5 border-t border-white/[0.08] pt-4">
                <p className="text-muted-foreground text-[10px]">现实核验</p>
                <ul className="mt-2 space-y-1.5 text-xs leading-5 text-white/65">
                  {assumption.realityTest.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </section>

        <section aria-labelledby="blind-spots-title">
          <p className="text-muted-foreground flex items-center gap-2 text-xs tracking-[0.15em] uppercase">
            <AlertTriangle
              aria-hidden="true"
              className="size-4 text-amber-300"
            />
            Blind spots
          </p>
          <h2 className="mt-2 text-xl font-semibold" id="blind-spots-title">
            这条路径最容易忽略的地方
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {blindSpots.map((blindSpot, index) => (
              <article
                className="surface-lift rounded-2xl border border-white/[0.08] bg-black/10 p-4"
                key={blindSpot.id}
              >
                <span className="text-muted-foreground text-[10px]">
                  0{index + 1}
                </span>
                <h3 className="mt-2 text-sm font-medium">{blindSpot.title}</h3>
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  {blindSpot.text}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="stage-reveal mt-6 grid gap-6 xl:grid-cols-2">
        <section className="border-world-bridge/20 bg-world-bridge/[0.04] rounded-3xl border p-5 sm:p-7">
          <p className="text-world-bridge flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
            <Mail aria-hidden="true" className="size-4" />
            Future letter · {futureLetter.tone}
          </p>
          <h2 className="mt-3 text-xl font-semibold">一年后的你写来一封信</h2>
          <blockquote className="border-world-bridge/50 mt-5 border-l-2 pl-5 text-sm leading-8 text-white/75">
            {futureLetter.template}
          </blockquote>
          <p className="text-muted-foreground mt-5 border-t border-white/[0.08] pt-4 text-[10px] leading-4">
            {outcomes.offlineFallback.futureLetterLabel}
          </p>
        </section>

        <section className="border-signal-lime/20 bg-signal-lime/[0.035] rounded-3xl border p-5 sm:p-7">
          <p className="text-signal-lime flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
            <FlaskConical aria-hidden="true" className="size-4" />
            七天现实实验
          </p>
          <h2 className="mt-3 text-xl font-semibold">{experiment.title}</h2>
          <p className="text-muted-foreground mt-2 text-xs leading-5">
            {isDemoSession
              ? "演示模式：用 7 次点击预览现实信息，不会被当成真实七天记录。"
              : "真实模式：每天解锁一条记录，用 7 天拿到现实证据，再重算下一步。"}
          </p>
          {!isDemoSession ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-300/15 bg-blue-300/[0.045] p-4 text-xs leading-5 text-blue-100/80">
              <CalendarDays
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-blue-200"
              />
              <p>
                真实记录保存在当前浏览器。今天只能完成当天任务；刷新、复制链接或返回报告都不会提前解锁明天。
              </p>
            </div>
          ) : null}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-black/10 p-4">
              <p className="text-muted-foreground flex items-center gap-2 text-[10px] font-medium">
                <CircleHelp aria-hidden="true" className="size-3" /> 要验证什么
              </p>
              <p className="mt-2 text-xs leading-5 text-white/75">
                {experiment.question}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-black/10 p-4">
              <p className="text-muted-foreground flex items-center gap-2 text-[10px] font-medium">
                <Target aria-hidden="true" className="size-3" /> 为什么现在查
              </p>
              <p className="mt-2 text-xs leading-5 text-white/75">
                {experiment.whyNow}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-white/[0.08] bg-black/10 p-4">
            <p className="text-muted-foreground text-[10px] font-medium tracking-[0.14em] uppercase">
              为什么是这个实验
            </p>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-white/70">
              {(
                comparison.experimentSelection?.reasons ?? [
                  "这条路径没有命中更具体的实验，先从基础核验开始。"
                ]
              ).map((reason) => (
                <li className="flex gap-2" key={reason}>
                  <span className="text-signal-lime" aria-hidden="true">
                    ·
                  </span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground mt-5 text-[10px] font-medium tracking-[0.14em] uppercase">
            七天怎么做
          </p>
          <ol className="mt-5 space-y-3">
            {experiment.steps.map((step, index) => (
              <li
                className="flex gap-3 text-xs leading-6 text-white/70"
                key={step}
              >
                <span className="bg-signal-lime/10 text-signal-lime flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px]">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-2xl border border-blue-300/15 bg-blue-300/[0.045] p-4">
            <p className="flex items-center gap-2 text-[10px] font-medium text-blue-200">
              <Check aria-hidden="true" className="size-3" /> 什么算证据
            </p>
            <p className="text-muted-foreground mt-1.5 text-xs leading-5">
              {experiment.evidence}
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {resultMeaning.map((meaning) => (
              <div
                className="rounded-2xl border border-white/[0.08] bg-black/10 p-4"
                key={meaning.key}
              >
                <p className={`text-[10px] font-medium ${meaning.color}`}>
                  {meaning.label}
                </p>
                <p className="text-muted-foreground mt-1.5 text-xs leading-5">
                  {experiment.resultMeaning[meaning.key]}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-white/[0.09] bg-black/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {isDemoSession ? "七天推进模拟" : "真实七天记录"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  {isDemoSession
                    ? "每推进一天，都会看到一条新的现实信息。这里不等七天，点击即可演示。"
                    : "完成、跳过或改期都会留下原因；它们不会被包装成已经完成的实验。"}
                </p>
              </div>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/55">
                {isDemoSession ? "演示用" : "真实记录"}
              </span>
            </div>
            {isDemoSession && !experimentRun?.feedback ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={fastForwardRealityExperiment}
                  size="sm"
                  variant="secondary"
                >
                  快速推进实验
                  <ArrowRight aria-hidden="true" />
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={demoResetHref}>
                    <RotateCcw aria-hidden="true" />
                    重置 Demo
                  </Link>
                </Button>
              </div>
            ) : null}
            {experimentRun ? (
              <>
                <div
                  className="mt-4 flex items-center gap-2"
                  aria-label={`实验进度：第 ${experimentRun.day} 天，共 7 天`}
                >
                  {experimentDays.map((day) => (
                    <span
                      className={`h-1.5 flex-1 rounded-full ${day.day <= experimentRun.day ? "bg-signal-lime" : "bg-white/10"}`}
                      key={day.day}
                    />
                  ))}
                </div>
                <p className="text-muted-foreground mt-2 text-[10px]">
                  已推进 {experimentRun.day} / 7 天
                </p>
                {!isDemoSession && experimentRun.startedOn ? (
                  <div
                    className="mt-4 grid grid-cols-7 gap-1.5"
                    aria-label="真实实验日历"
                  >
                    {experimentDays.map((day) => {
                      const event = experimentEvents.find(
                        (item) => item.day === day.day
                      );
                      const isNext = day.day === experimentRun.day + 1;
                      return (
                        <div
                          className={`rounded-lg border p-2 text-center text-[10px] ${event ? "border-signal-lime/25 bg-signal-lime/[0.06] text-signal-lime" : isNext ? "border-blue-300/30 bg-blue-300/[0.06] text-blue-100" : "border-white/[0.08] text-white/35"}`}
                          key={day.day}
                        >
                          <p>第 {day.day} 天</p>
                          <p className="mt-0.5 text-[9px] opacity-75">
                            {addCalendarDays(
                              experimentRun.startedOn!,
                              day.day - 1
                            )}
                          </p>
                          <p className="mt-1 text-[9px]">
                            {event
                              ? event.status === "skipped"
                                ? "跳过"
                                : "完成"
                              : isNext
                                ? "下一步"
                                : "待解锁"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {experimentRun.day > 0 ? (
                  <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-signal-lime text-[10px] font-medium">
                        已留下的现实记录
                      </p>
                      <span className="text-muted-foreground text-[10px]">
                        证据进度 {experimentRun.evidenceScore ?? 0} / 100
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {experimentEvents.map((event) => {
                        const day = experimentDays[event.day - 1];
                        return (
                          <div
                            className="rounded-lg border border-white/[0.07] p-3"
                            key={`${event.day}-${event.choice}`}
                          >
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              <span className="text-signal-lime font-medium">
                                第 {event.day} 天 · {day?.title}
                              </span>
                              {event.status === "skipped" ? (
                                <span className="rounded-full border border-white/10 px-2 py-0.5 text-white/60">
                                  已跳过
                                </span>
                              ) : null}
                              {event.occurredOn ? (
                                <span className="text-white/45">
                                  {event.occurredOn}
                                </span>
                              ) : null}
                              {event.surprise ? (
                                <span className="text-world-leap rounded-full border border-orange-300/20 bg-orange-300/10 px-2 py-0.5">
                                  意外情况
                                </span>
                              ) : null}
                            </div>
                            <p className="text-muted-foreground mt-1.5 text-xs leading-5">
                              你的动作：{event.choice}
                            </p>
                            {event.note ? (
                              <p className="mt-1.5 text-xs leading-5 text-blue-100/80">
                                你的记录：{event.note}
                              </p>
                            ) : null}
                            {event.evidenceType || event.feeling ? (
                              <p className="text-muted-foreground mt-1.5 text-[10px] leading-4">
                                {event.evidenceType
                                  ? `证据类型：${event.evidenceType}`
                                  : ""}
                                {event.evidenceType && event.feeling
                                  ? " · "
                                  : ""}
                                {event.feeling ? `感受：${event.feeling}` : ""}
                              </p>
                            ) : null}
                            {event.evidenceSignal || event.blocker ? (
                              <p className="text-muted-foreground mt-1.5 text-[10px] leading-4">
                                {event.evidenceSignal
                                  ? `证据判断：${evidenceSignalLabels[event.evidenceSignal]}`
                                  : ""}
                                {event.evidenceSignal && event.blocker
                                  ? " · "
                                  : ""}
                                {event.blocker
                                  ? `实际阻碍：${blockerLabels[event.blocker]}`
                                  : ""}
                              </p>
                            ) : null}
                            {event.nextStep ? (
                              <p className="mt-1.5 text-[10px] leading-4 text-white/65">
                                明天：{event.nextStep}
                              </p>
                            ) : null}
                            <p className="text-muted-foreground mt-1.5 text-[10px] leading-4">
                              对照证据：{day?.evidence}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {!isDemoSession && nextExperimentAdjustment ? (
                  <div className="mt-4 rounded-xl border border-blue-300/20 bg-blue-300/[0.045] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-xs font-medium text-blue-100">
                        <BadgeCheck aria-hidden="true" className="size-4" />
                        给第 {nextExperimentAdjustment.targetDay} 天的调整建议
                      </p>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/60">
                        来自第 {nextExperimentAdjustment.sourceDay} 天记录
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      {nextExperimentAdjustment.explanation}
                    </p>
                    <div className="mt-3 rounded-lg border border-white/[0.08] bg-black/15 p-3">
                      <p className="text-[10px] text-white/45">原计划</p>
                      <p className="mt-1 text-xs leading-5 text-white/70">
                        {nextExperimentAdjustment.originalAction}
                      </p>
                      <p className="mt-3 text-[10px] text-blue-200/70">
                        建议改为
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white">
                        {nextExperimentAdjustment.recommendedAction}
                      </p>
                    </div>
                    {nextExperimentAdjustment.status === "suggested" ? (
                      <>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button onClick={acceptTodayAdjustment} size="sm">
                            采用建议
                          </Button>
                          <Button
                            onClick={revertTodayAdjustment}
                            size="sm"
                            variant="ghost"
                          >
                            保持原计划
                          </Button>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <input
                            className="h-9 min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/20 px-3 text-xs text-white"
                            maxLength={240}
                            onChange={(event) =>
                              setCustomAdjustmentAction(event.target.value)
                            }
                            placeholder="或写下你自己的下一步"
                            value={customAdjustmentAction}
                          />
                          <Button
                            disabled={!customAdjustmentAction.trim()}
                            onClick={customizeTodayAdjustment}
                            size="sm"
                            variant="outline"
                          >
                            保存自定义
                          </Button>
                        </div>
                      </>
                    ) : nextExperimentAdjustment.status === "reverted" ? (
                      <p className="mt-3 text-[10px] leading-4 text-white/55">
                        你选择保留原计划；本条建议会留在记录中，但不会改变下一天的动作。
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-signal-lime text-[10px] leading-4">
                          已写入下一步：{nextExperimentAdjustment.appliedAction}
                        </p>
                        <Button
                          onClick={revertTodayAdjustment}
                          size="sm"
                          variant="ghost"
                        >
                          撤销调整
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
                {experimentRun.status === "stopped" ? (
                  <div className="border-world-leap/25 bg-world-leap/[0.06] mt-4 rounded-xl border p-4">
                    <p className="text-world-leap text-xs font-medium">
                      实验已提前停止
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      停止原因：{experimentRun.stopReason}
                    </p>
                    <p className="text-muted-foreground mt-2 text-[10px] leading-4">
                      它没有形成七天结论；这也是一条真实记录，之后可以重新开始新的实验。
                    </p>
                  </div>
                ) : experimentRun.day < 7 ? (
                  !isDemoSession && !experimentAvailability.available ? (
                    <div className="mt-4 rounded-xl border border-blue-300/20 bg-blue-300/[0.045] p-4">
                      <p className="text-sm font-medium text-blue-100">
                        今天还不需要推进
                      </p>
                      <p className="text-muted-foreground mt-1.5 text-xs leading-5">
                        {experimentAvailability.reason}
                      </p>
                      <label className="text-muted-foreground mt-4 block text-[10px]">
                        想把下一次记录改到哪天？
                        <input
                          className="focus:border-zhihu/50 mt-1.5 h-9 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 text-xs text-white outline-none"
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(event) =>
                            setRescheduleDate(event.target.value)
                          }
                          type="date"
                          value={rescheduleDate}
                        />
                      </label>
                      <Button
                        className="mt-3"
                        disabled={!rescheduleDate}
                        onClick={rescheduleToday}
                        size="sm"
                        variant="outline"
                      >
                        保存改期
                      </Button>
                    </div>
                  ) : (
                    <div className="border-signal-lime/15 bg-signal-lime/[0.045] mt-4 rounded-xl border p-4">
                      {(() => {
                        const nextDay = experimentDays[experimentRun.day];
                        const appliedAdjustmentAction =
                          nextExperimentAdjustment?.targetDay === nextDay.day &&
                          (nextExperimentAdjustment.status === "accepted" ||
                            nextExperimentAdjustment.status === "customized")
                            ? nextExperimentAdjustment.appliedAction
                            : undefined;
                        const choices = appliedAdjustmentAction
                          ? [appliedAdjustmentAction, nextDay.action]
                          : (nextDay.choices ?? [
                              nextDay.action,
                              "先补信息再决定"
                            ]);
                        const selectedChoice =
                          pendingChoice ??
                          appliedAdjustmentAction ??
                          choices[0];
                        return (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-signal-lime text-[10px] font-medium">
                                第 {nextDay.day} 天 · {nextDay.title}
                              </p>
                              {nextDay.surprise ? (
                                <span className="text-world-leap rounded-full border border-orange-300/20 bg-orange-300/10 px-2 py-0.5 text-[10px]">
                                  今天可能有意外
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-xs leading-5 text-white/75">
                              {nextDay.situation}
                            </p>
                            <p className="text-muted-foreground mt-2 text-[10px] leading-4">
                              {nextDay.evidencePrompt}
                            </p>
                            <div
                              className="mt-3 grid gap-2 sm:grid-cols-2"
                              role="group"
                              aria-label={`第 ${nextDay.day} 天选择`}
                            >
                              {choices.map((choice) => (
                                <button
                                  aria-pressed={selectedChoice === choice}
                                  className={`rounded-lg border px-3 py-2.5 text-left text-xs transition ${
                                    selectedChoice === choice
                                      ? "border-signal-lime/50 bg-signal-lime/10 text-white"
                                      : "border-white/[0.08] bg-white/[0.025] text-white/70 hover:border-white/20 hover:bg-white/[0.06]"
                                  }`}
                                  key={choice}
                                  onClick={() => setPendingChoice(choice)}
                                  type="button"
                                >
                                  {choice}
                                </button>
                              ))}
                            </div>
                            <label className="text-muted-foreground mt-3 block text-[10px]">
                              今天发生了什么（可选）
                              <textarea
                                className="focus:border-signal-lime/40 mt-1.5 min-h-16 w-full resize-y rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30"
                                maxLength={240}
                                onChange={(event) =>
                                  setPendingNote(event.target.value)
                                }
                                placeholder="例如：对方说下周给合同，但没有给具体日期"
                                value={pendingNote}
                              />
                            </label>
                            {!isDemoSession ? (
                              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                                <label className="text-muted-foreground text-[10px]">
                                  证据类型
                                  <select
                                    className="mt-1 block h-9 w-full rounded-lg border border-white/[0.08] bg-black/20 px-2 text-xs text-white"
                                    onChange={(event) =>
                                      setPendingEvidenceType(
                                        event.target.value as EvidenceType
                                      )
                                    }
                                    value={pendingEvidenceType}
                                  >
                                    <option value="document">
                                      材料 / 文档
                                    </option>
                                    <option value="conversation">
                                      沟通反馈
                                    </option>
                                    <option value="observation">
                                      现场观察
                                    </option>
                                    <option value="number">数字 / 账目</option>
                                    <option value="other">其他</option>
                                  </select>
                                </label>
                                <label className="text-muted-foreground text-[10px]">
                                  今天的感受
                                  <select
                                    className="mt-1 block h-9 w-full rounded-lg border border-white/[0.08] bg-black/20 px-2 text-xs text-white"
                                    onChange={(event) =>
                                      setPendingFeeling(
                                        event.target.value as Feeling
                                      )
                                    }
                                    value={pendingFeeling}
                                  >
                                    <option value="clearer">更清楚了</option>
                                    <option value="steady">基本稳定</option>
                                    <option value="stretched">有点吃力</option>
                                    <option value="blocked">被卡住了</option>
                                  </select>
                                </label>
                                <label className="text-muted-foreground text-[10px]">
                                  这条信息更像
                                  <select
                                    className="mt-1 block h-9 w-full rounded-lg border border-white/[0.08] bg-black/20 px-2 text-xs text-white"
                                    onChange={(event) =>
                                      setPendingEvidenceSignal(
                                        event.target.value as EvidenceSignal
                                      )
                                    }
                                    value={pendingEvidenceSignal}
                                  >
                                    <option value="supported">
                                      支持原假设
                                    </option>
                                    <option value="contradicted">
                                      和原假设冲突
                                    </option>
                                    <option value="insufficient">
                                      还不能判断
                                    </option>
                                  </select>
                                </label>
                                <label className="text-muted-foreground text-[10px]">
                                  遇到的阻碍（可选）
                                  <select
                                    className="mt-1 block h-9 w-full rounded-lg border border-white/[0.08] bg-black/20 px-2 text-xs text-white"
                                    onChange={(event) =>
                                      setPendingBlocker(
                                        event.target.value as
                                          ExperimentBlocker | ""
                                      )
                                    }
                                    value={pendingBlocker}
                                  >
                                    <option value="">没有 / 不确定</option>
                                    <option value="no_response">
                                      对方没有回复
                                    </option>
                                    <option value="missing_material">
                                      材料拿不到
                                    </option>
                                    <option value="conditions_changed">
                                      条件突然变化
                                    </option>
                                    <option value="time_or_cost">
                                      时间或成本超标
                                    </option>
                                    <option value="other">其他</option>
                                  </select>
                                </label>
                                <label className="text-muted-foreground text-[10px]">
                                  明天最小一步
                                  <input
                                    className="mt-1 h-9 w-full rounded-lg border border-white/[0.08] bg-black/20 px-2 text-xs text-white"
                                    maxLength={240}
                                    onChange={(event) =>
                                      setPendingNextStep(event.target.value)
                                    }
                                    placeholder="例如补一份材料"
                                    value={pendingNextStep}
                                  />
                                </label>
                              </div>
                            ) : null}
                            <Button
                              className="mt-3 w-full"
                              onClick={advanceRealityExperiment}
                            >
                              {isDemoSession
                                ? `推进到第 ${experimentRun.day + 1} 天`
                                : "完成今天的记录"}
                              <ArrowRight aria-hidden="true" />
                            </Button>
                            {!isDemoSession ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button
                                  onClick={skipToday}
                                  size="sm"
                                  variant="ghost"
                                >
                                  今天跳过
                                </Button>
                                <label className="flex items-center gap-2 text-[10px] text-white/55">
                                  改期到
                                  <input
                                    className="h-8 rounded-md border border-white/[0.08] bg-black/20 px-2 text-xs text-white"
                                    min={new Date().toISOString().slice(0, 10)}
                                    onChange={(event) =>
                                      setRescheduleDate(event.target.value)
                                    }
                                    type="date"
                                    value={rescheduleDate}
                                  />
                                </label>
                                <Button
                                  disabled={!rescheduleDate}
                                  onClick={rescheduleToday}
                                  size="sm"
                                  variant="ghost"
                                >
                                  保存改期
                                </Button>
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  )
                ) : (
                  <div className="mt-4">
                    <p className="text-muted-foreground text-xs leading-5">
                      七天记录完成。现在选一个最接近证据的结果：
                    </p>
                    <div
                      className="mt-3 grid gap-2 sm:grid-cols-3"
                      role="group"
                      aria-label="选择实验模拟反馈"
                    >
                      {feedbackOptions.map((option) => (
                        <button
                          aria-pressed={experimentRun.feedback === option.key}
                          className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                            experimentRun.feedback === option.key
                              ? "border-white/30 bg-white/[0.1]"
                              : "border-white/[0.08] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.06]"
                          }`}
                          key={option.key}
                          onClick={() => chooseExperimentFeedback(option.key)}
                          type="button"
                        >
                          <span className={`font-medium ${option.color}`}>
                            {option.label}
                          </span>
                        </button>
                      ))}
                    </div>
                    {experimentRun.feedback ? (
                      <div
                        aria-live="polite"
                        className="mt-4 rounded-xl border border-blue-300/15 bg-blue-300/[0.045] p-4"
                        role="status"
                      >
                        <p className="text-xs font-medium text-blue-100">
                          {isDemoSession
                            ? "已记录演示反馈："
                            : "七天后的证据结论："}
                          {
                            feedbackOptions.find(
                              (option) => option.key === experimentRun.feedback
                            )?.label
                          }
                        </p>
                        <p className="text-muted-foreground mt-2 text-xs leading-5">
                          {experiment.resultMeaning[experimentRun.feedback]}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-white/80">
                          下一步建议：
                          {experiment.nextStep[experimentRun.feedback]}
                        </p>
                        <p className="text-muted-foreground mt-3 border-t border-white/[0.08] pt-3 text-[10px] leading-4">
                          {isDemoSession
                            ? "这是演示反馈，不会真的等待七天，也不会在后台持续跟踪。"
                            : `实验开始前你的判断是「${assumptionResultLabel}」，七天记录后的结论是「${feedbackOptions.find((option) => option.key === experimentRun.feedback)?.label}」。`}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-muted-foreground mt-4 text-xs leading-5">
                  {isDemoSession
                    ? "现在开始，先推进第一天；这份演示状态会保存在本地，刷新后不会丢。"
                    : "从今天开始记录第 1 天。之后每天按真实日期解锁，记录只保存在这个浏览器。"}
                </p>
                <Button
                  className="mt-4 w-full"
                  onClick={startRealityExperiment}
                >
                  {isDemoSession ? "开始演示七天模拟" : "开始真实七天记录"}
                  <FlaskConical aria-hidden="true" />
                </Button>
              </>
            )}
            {!isDemoSession && experimentRun?.status === "active" ? (
              <div className="mt-5 border-t border-white/[0.08] pt-4">
                <p className="text-world-leap text-[10px] font-medium">
                  提前停止实验
                </p>
                <p className="text-muted-foreground mt-1 text-[10px] leading-4">
                  停止不是失败。请留下一句原因，让未来回看时知道为什么没有继续。
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    className="h-9 min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/20 px-3 text-xs text-white"
                    maxLength={240}
                    onChange={(event) => setStopReason(event.target.value)}
                    placeholder="例如：工作突发项目，无法继续保证时间"
                    value={stopReason}
                  />
                  <Button
                    disabled={!stopReason.trim()}
                    onClick={stopCurrentExperiment}
                    size="sm"
                    variant="outline"
                  >
                    停止
                  </Button>
                </div>
              </div>
            ) : null}
            {experimentError ? (
              <p className="text-world-leap mt-3 text-xs" role="alert">
                {experimentError}
              </p>
            ) : null}
          </div>
          {!isDemoSession ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
              <Button
                onClick={downloadExperimentRecord}
                size="sm"
                variant="ghost"
              >
                <Download aria-hidden="true" />
                导出我的实验记录
              </Button>
              {showDeleteConfirm ? (
                <>
                  <span className="text-world-leap self-center text-[10px]">
                    将删除这次推演和实验，无法恢复。
                  </span>
                  <Button
                    onClick={deleteCurrentSession}
                    size="sm"
                    variant="destructive"
                  >
                    确认删除
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    size="sm"
                    variant="ghost"
                  >
                    取消
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 aria-hidden="true" />
                  删除本次本地记录
                </Button>
              )}
            </div>
          ) : null}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] p-4">
              <p className="text-muted-foreground flex items-center gap-2 text-[10px]">
                <Clock3 aria-hidden="true" className="size-3" /> 时间上限
              </p>
              <p className="mt-1.5 text-xs font-medium">
                {experiment.timeBudget}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] p-4">
              <p className="text-muted-foreground flex items-center gap-2 text-[10px]">
                <Banknote aria-hidden="true" className="size-3" /> 花费上限
              </p>
              <p className="mt-1.5 text-xs font-medium">
                {experiment.moneyBudget}
              </p>
            </div>
          </div>
          <div className="border-world-leap/20 bg-world-leap/[0.05] mt-3 rounded-2xl border p-4">
            <p className="text-world-leap flex items-center gap-2 text-[10px] font-medium">
              <Target aria-hidden="true" className="size-3" /> 退出规则
            </p>
            <p className="mt-1.5 text-xs leading-5 text-white/70">
              {experiment.exitRule}
            </p>
          </div>
        </section>
      </div>

      <ShareResultCard data={shareCardData} />

      <section aria-labelledby="sources-title" className="stage-reveal mt-6">
        <div>
          <p className="text-muted-foreground flex items-center gap-2 text-xs tracking-[0.15em] uppercase">
            <BookOpenText aria-hidden="true" className="size-4 text-blue-300" />
            Evidence anchors
          </p>
          <h2 className="mt-2 text-xl font-semibold" id="sources-title">
            支撑本次展开的关键知乎经验
          </h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {keySources.map((source) => (
            <article
              className="surface-lift rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"
              key={source.id}
            >
              <p className="text-muted-foreground text-[10px]">
                {source.author} ·{" "}
                {source.contentType === "Answer" ? "回答" : "文章"}
              </p>
              <h3 className="mt-2 line-clamp-2 text-xs leading-5 font-medium">
                {source.title}
              </h3>
              <p className="text-muted-foreground mt-2 line-clamp-3 text-xs leading-5">
                {source.claim}
              </p>
              <a
                className="mt-3 inline-flex items-center gap-1 text-xs text-blue-200 hover:text-white"
                href={source.url}
                rel="noreferrer"
                target="_blank"
              >
                查看原文
                <ExternalLink aria-hidden="true" className="size-3" />
              </a>
            </article>
          ))}
        </div>
        <p className="text-muted-foreground mt-4 text-[10px] leading-4">
          {outcomes.offlineFallback.sourceDisclaimer}
        </p>
      </section>

      <div className="stage-reveal mt-7 flex flex-col gap-3 rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            把地图带回现实，而不是停在报告里。
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            可复制为纯文本发给队友，或重新开始另一条世界。
          </p>
          {copyState === "error" ? (
            <p className="text-world-leap mt-2 text-xs" role="alert">
              复制失败，请检查浏览器剪贴板权限。
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={copyResult} variant="secondary">
            {copyState === "copied" ? (
              <Check aria-hidden="true" />
            ) : (
              <Clipboard aria-hidden="true" />
            )}
            {copyState === "copied" ? "已复制文本结果" : "复制文本结果"}
          </Button>
          <Button asChild>
            <Link href="/">
              <RotateCcw aria-hidden="true" />
              重新开始
            </Link>
          </Button>
        </div>
      </div>
    </PageFrame>
  );
}
