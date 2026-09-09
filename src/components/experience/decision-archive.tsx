"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  GitBranch,
  History,
  Lightbulb,
  Plus,
  Trash2
} from "lucide-react";

import { PageFrame } from "@/components/experience/page-frame";
import { Button } from "@/components/ui/button";
import {
  completeDecisionReview,
  createDecisionBranch,
  deleteAllDecisionArchives,
  deleteSession,
  getDecisionRecordHints,
  getPlayableContent,
  listDecisionArchives,
  saveSession,
  scheduleDecisionReview,
  type DecisionReviewKind,
  type GameSession
} from "@/features/game";
import { LOCAL_GAME_STORAGE_EVENT } from "@/features/game/storage";

const reviewKindLabels: Record<DecisionReviewKind, string> = {
  seven_day: "7 天后",
  thirty_day: "30 天后",
  custom: "自定义日期"
};

function formatDate(date: string) {
  return date.replaceAll("-", ".");
}

function worldName(session: GameSession) {
  const content = getPlayableContent(session.scenarioId);
  return (
    content.scenario.worlds.find((world) => world.id === session.selectedWorld)
      ?.name ?? "未命名路线"
  );
}

function questionTitle(session: GameSession) {
  return getPlayableContent(session.scenarioId).scenario.title;
}

function experimentTitle(session: GameSession) {
  const content = getPlayableContent(session.scenarioId);
  return content.outcomes.sevenDayExperiments.find(
    (experiment) => experiment.id === session.experimentRun?.experimentId
  )?.title;
}

function assumptionLabel(session: GameSession) {
  const content = getPlayableContent(session.scenarioId);
  return content.outcomes.assumptionBlasts.find(
    (assumption) => assumption.id === session.blastedAssumptionId
  )?.label;
}

function actionLabels(session: GameSession) {
  const content = getPlayableContent(session.scenarioId);
  const actions = content.scenario.worlds.flatMap((world) =>
    world.acts.flatMap((scene) => scene.actions)
  );
  return session.actionHistory
    .map((id) => actions.find((action) => action.id === id)?.label)
    .filter((label): label is string => Boolean(label));
}

export function DecisionArchive() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [customDate, setCustomDate] = useState("");
  const [reviewTarget, setReviewTarget] = useState<{
    sessionId: string;
    reviewId: string;
  }>();
  const [whatHappened, setWhatHappened] = useState("");
  const [differenceFromThen, setDifferenceFromThen] = useState("");
  const [branchTargetId, setBranchTargetId] = useState<string>();
  const [newInformation, setNewInformation] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string>();
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener(LOCAL_GAME_STORAGE_EVENT, onStoreChange);
    window.addEventListener("storage", onStoreChange);
    return () => {
      window.removeEventListener(LOCAL_GAME_STORAGE_EVENT, onStoreChange);
      window.removeEventListener("storage", onStoreChange);
    };
  }, []);
  const getArchiveSnapshot = useCallback(() => {
    const rows: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith("life-fork-machine:session:v1:")) continue;
      rows.push(`${key}:${window.localStorage.getItem(key) ?? ""}`);
    }
    return rows.sort().join("\n");
  }, []);
  const archiveSnapshot = useSyncExternalStore(
    subscribe,
    getArchiveSnapshot,
    () => ""
  );
  const archives = useMemo(
    () => (archiveSnapshot ? listDecisionArchives(window.localStorage) : []),
    [archiveSnapshot]
  );

  function save(nextSession: GameSession, successMessage: string) {
    saveSession(window.localStorage, nextSession);
    setMessage(successMessage);
  }

  function schedule(session: GameSession, kind: DecisionReviewKind) {
    try {
      save(
        scheduleDecisionReview(session, kind, {
          dueOn: kind === "custom" ? customDate : undefined
        }),
        `已保存${reviewKindLabels[kind]}复盘。它只在这个浏览器的档案中保留。`
      );
      setCustomDate("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "复盘日期没有保存");
    }
  }

  function completeReview(session: GameSession, reviewId: string) {
    try {
      save(
        completeDecisionReview(session, reviewId, {
          whatHappened,
          differenceFromThen
        }),
        "复盘已补进档案；它不会改写当时的路线或证据。"
      );
      setReviewTarget(undefined);
      setWhatHappened("");
      setDifferenceFromThen("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "复盘暂时无法保存");
    }
  }

  function createBranch(session: GameSession) {
    try {
      const branch = createDecisionBranch(session, newInformation);
      saveSession(window.localStorage, branch);
      router.push(`/result/${branch.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "分支暂时无法创建");
    }
  }

  function removeOne(sessionId: string) {
    deleteSession(window.localStorage, sessionId);
    setDeleteTargetId(undefined);
    setMessage("已删除这一条本地档案；其他档案和校准数据没有变化。");
  }

  function removeAll() {
    const count = deleteAllDecisionArchives(window.localStorage);
    setConfirmDeleteAll(false);
    setMessage(
      `已删除 ${count} 条本地决策档案；校准、内容审核与固定 Demo 没有变化。`
    );
  }

  return (
    <PageFrame
      actions={
        <Button asChild size="sm" variant="ghost">
          <Link href="/">
            返回首页
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      }
      description="这里保存的是当时的依据，而不是事后改写的答案。复盘与新信息会追加到档案或创建分支，原版本始终保留。"
      eyebrow="DECISION ARCHIVE / LOCAL ONLY"
      title="把每一次决定，留给未来的你。"
    >
      <section className="glass-panel rounded-3xl border border-white/10 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-200">
              <Archive aria-hidden="true" className="size-4" />
              <p className="text-xs font-medium tracking-[0.14em] uppercase">
                仅保存在当前浏览器
              </p>
            </div>
            <h2 className="mt-3 text-xl font-semibold">我的决策档案</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              已保存 {archives.length}{" "}
              条完整决策。每一条都包含问题、约束、实际路线、关键假设和现实实验；不会同步到云端。
            </p>
          </div>
          {archives.length > 0 ? (
            <Button
              onClick={() => setConfirmDeleteAll(true)}
              size="sm"
              variant="outline"
            >
              <Trash2 aria-hidden="true" />
              清空全部档案
            </Button>
          ) : null}
        </div>
        {message ? (
          <p
            aria-live="polite"
            className="mt-4 rounded-xl border border-blue-300/20 bg-blue-300/[0.05] px-4 py-3 text-xs leading-5 text-blue-100"
            role="status"
          >
            {message}
          </p>
        ) : null}
        {confirmDeleteAll ? (
          <div className="border-world-leap/25 bg-world-leap/[0.06] mt-4 rounded-xl border p-4">
            <p className="text-world-leap text-sm font-medium">
              确定清空全部档案？
            </p>
            <p className="text-muted-foreground mt-1.5 text-xs leading-5">
              这会删除当前浏览器中的全部个人决策会话，无法恢复；不会删除固定
              Demo、校准或知乎素材审核记录。
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={removeAll} size="sm" variant="destructive">
                确认清空
              </Button>
              <Button
                onClick={() => setConfirmDeleteAll(false)}
                size="sm"
                variant="ghost"
              >
                取消
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {archives.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
          <History
            aria-hidden="true"
            className="mx-auto size-7 text-white/40"
          />
          <h2 className="mt-4 text-lg font-semibold">还没有可回看的决策</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
            完成一次普通推演后，它会自动出现在这里。固定 Demo
            不会混进你的个人档案。
          </p>
          <Button asChild className="mt-5">
            <Link href="/">开始一次推演</Link>
          </Button>
        </section>
      ) : (
        <div className="mt-6 space-y-5">
          {archives.map((session) => {
            const reviews = session.decisionReviews ?? [];
            const isReviewing = reviewTarget?.sessionId === session.id;
            const isBranching = branchTargetId === session.id;
            return (
              <article
                className="rounded-3xl border border-white/[0.09] bg-black/15 p-5 sm:p-6"
                key={session.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium tracking-[0.15em] text-blue-200 uppercase">
                      {session.decisionLineage ? "新信息分支" : "原始决策版本"}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      {questionTitle(session)}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      {formatDate(session.createdAt.slice(0, 10))} 创建 · 走过「
                      {worldName(session)}」
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/result/${session.id}`}>打开当时报告</Link>
                    </Button>
                    <Button
                      onClick={() => setDeleteTargetId(session.id)}
                      size="sm"
                      variant="ghost"
                    >
                      删除
                    </Button>
                  </div>
                </div>

                {session.decisionLineage ? (
                  <div className="mt-4 rounded-xl border border-blue-300/20 bg-blue-300/[0.045] p-4">
                    <p className="flex items-center gap-2 text-xs font-medium text-blue-100">
                      <GitBranch aria-hidden="true" className="size-4" />
                      基于父档案{" "}
                      {session.decisionLineage.parentSessionId.slice(0, 8)} 创建
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/80">
                      新信息：{session.decisionLineage.newInformation}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-white/[0.08] p-3">
                    <p className="text-[10px] text-white/45">当时的约束</p>
                    <p className="mt-1 text-xs leading-5 text-white/80">
                      {Object.values(session.calibration)
                        .filter(Boolean)
                        .join(" · ") || "未完整记录"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] p-3">
                    <p className="text-[10px] text-white/45">当时的选择</p>
                    <p className="mt-1 text-xs leading-5 text-white/80">
                      {actionLabels(session).join(" → ") || "未找到动作记录"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] p-3">
                    <p className="text-[10px] text-white/45">现实实验</p>
                    <p className="mt-1 text-xs leading-5 text-white/80">
                      {experimentTitle(session) ?? "尚未启动实验"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] p-3">
                    <p className="text-[10px] text-white/45">关键假设</p>
                    <p className="mt-1 text-xs leading-5 text-white/80">
                      {assumptionLabel(session) ?? "尚未核验假设"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] p-3">
                    <p className="text-[10px] text-white/45">实验状态</p>
                    <p className="mt-1 text-xs leading-5 text-white/80">
                      {session.experimentRun?.status === "completed"
                        ? "已完成七天"
                        : session.experimentRun?.status === "stopped"
                          ? "已提前停止"
                          : session.experimentRun
                            ? `记录到第 ${session.experimentRun.day} 天`
                            : "尚未开始"}
                    </p>
                    {session.experimentRun ? (
                      <p className="mt-1 text-[10px] text-white/45">
                        已留 {session.experimentRun.events?.length ?? 0}{" "}
                        条现实记录
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <section className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-4">
                    <p className="text-world-leap text-xs font-medium">
                      当时最担心什么
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-white/75">
                      {(session.ledger.costs.length
                        ? session.ledger.costs
                        : ["当时没有留下明确的代价记录"]
                      )
                        .slice(0, 3)
                        .map((cost) => (
                          <li key={cost}>· {cost}</li>
                        ))}
                    </ul>
                  </section>
                  <section className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-4">
                    <p className="text-signal-lime flex items-center gap-2 text-xs font-medium">
                      <Lightbulb aria-hidden="true" className="size-4" />
                      记录里的提醒，不是人格判断
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-white/75">
                      {getDecisionRecordHints(session).map((hint) => (
                        <li key={hint}>· {hint}</li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section className="mt-5 border-t border-white/[0.08] pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <CalendarDays
                          aria-hidden="true"
                          className="size-4 text-blue-200"
                        />
                        复盘时间线
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        写下后来发生了什么，再和当时担心的事对照；不会覆盖原始报告。
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => schedule(session, "seven_day")}
                        size="sm"
                        variant="ghost"
                      >
                        + 7 天后
                      </Button>
                      <Button
                        onClick={() => schedule(session, "thirty_day")}
                        size="sm"
                        variant="ghost"
                      >
                        + 30 天后
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <label className="text-[10px] text-white/55">
                      自定义复盘日期
                      <input
                        className="mt-1 block h-9 rounded-lg border border-white/[0.08] bg-black/20 px-3 text-xs text-white"
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(event) => setCustomDate(event.target.value)}
                        type="date"
                        value={customDate}
                      />
                    </label>
                    <Button
                      disabled={!customDate}
                      onClick={() => schedule(session, "custom")}
                      size="sm"
                      variant="outline"
                    >
                      添加复盘
                    </Button>
                  </div>
                  {reviews.length === 0 ? (
                    <p className="text-muted-foreground mt-4 text-xs">
                      还没有安排复盘。
                    </p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {reviews.map((review) => (
                        <div
                          className="rounded-xl border border-white/[0.08] p-3"
                          key={review.id}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-white/80">
                              {reviewKindLabels[review.kind]} ·{" "}
                              {formatDate(review.dueOn)}
                            </p>
                            {review.status === "completed" ? (
                              <span className="text-signal-lime text-[10px]">
                                已完成
                              </span>
                            ) : (
                              <Button
                                onClick={() => {
                                  setReviewTarget({
                                    sessionId: session.id,
                                    reviewId: review.id
                                  });
                                  setWhatHappened("");
                                  setDifferenceFromThen("");
                                }}
                                size="sm"
                                variant="ghost"
                              >
                                现在复盘
                              </Button>
                            )}
                          </div>
                          {review.status === "completed" ? (
                            <div className="mt-2 space-y-1 text-[10px] leading-4 text-white/60">
                              <p>后来发生：{review.whatHappened}</p>
                              <p>和当时不同：{review.differenceFromThen}</p>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                  {isReviewing && reviewTarget ? (
                    <div className="mt-4 rounded-xl border border-blue-300/20 bg-blue-300/[0.045] p-4">
                      <p className="text-xs font-medium text-blue-100">
                        填写这次复盘
                      </p>
                      <label className="mt-3 block text-[10px] text-white/55">
                        后来真正发生了什么？
                        <textarea
                          className="mt-1.5 min-h-20 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-white"
                          maxLength={600}
                          onChange={(event) =>
                            setWhatHappened(event.target.value)
                          }
                          value={whatHappened}
                        />
                      </label>
                      <label className="mt-3 block text-[10px] text-white/55">
                        它和当时最担心的事，有什么不同？
                        <textarea
                          className="mt-1.5 min-h-20 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-white"
                          maxLength={600}
                          onChange={(event) =>
                            setDifferenceFromThen(event.target.value)
                          }
                          value={differenceFromThen}
                        />
                      </label>
                      <div className="mt-3 flex gap-2">
                        <Button
                          disabled={
                            !whatHappened.trim() || !differenceFromThen.trim()
                          }
                          onClick={() =>
                            completeReview(session, reviewTarget.reviewId)
                          }
                          size="sm"
                        >
                          保存复盘
                        </Button>
                        <Button
                          onClick={() => setReviewTarget(undefined)}
                          size="sm"
                          variant="ghost"
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="mt-5 border-t border-white/[0.08] pt-5">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <GitBranch
                      aria-hidden="true"
                      className="size-4 text-blue-200"
                    />
                    新信息，不覆盖旧版本
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    写下一条后来得到的新信息，创建一份独立分支。父档案会保持不变。
                  </p>
                  {isBranching ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        className="h-10 min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/20 px-3 text-xs text-white"
                        maxLength={600}
                        onChange={(event) =>
                          setNewInformation(event.target.value)
                        }
                        placeholder="例如：客户确认下月会签约，但付款周期是 60 天"
                        value={newInformation}
                      />
                      <Button
                        disabled={!newInformation.trim()}
                        onClick={() => createBranch(session)}
                        size="sm"
                      >
                        创建分支
                        <Plus aria-hidden="true" />
                      </Button>
                      <Button
                        onClick={() => setBranchTargetId(undefined)}
                        size="sm"
                        variant="ghost"
                      >
                        取消
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="mt-3"
                      onClick={() => {
                        setBranchTargetId(session.id);
                        setNewInformation("");
                      }}
                      size="sm"
                      variant="outline"
                    >
                      用新信息创建分支
                    </Button>
                  )}
                </section>

                {deleteTargetId === session.id ? (
                  <div className="border-world-leap/25 bg-world-leap/[0.06] mt-5 rounded-xl border p-4">
                    <p className="text-world-leap text-xs">
                      确认删除这条本地档案？删除后无法恢复。
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={() => removeOne(session.id)}
                        size="sm"
                        variant="destructive"
                      >
                        确认删除此档案
                      </Button>
                      <Button
                        onClick={() => setDeleteTargetId(undefined)}
                        size="sm"
                        variant="ghost"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </PageFrame>
  );
}
