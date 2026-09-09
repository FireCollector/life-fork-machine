import {
  GameSessionSchema,
  type DecisionReviewKind,
  type GameSession
} from "./schema";
import { deleteSession, listSessions } from "./storage";

const FIXED_DEMO_SESSION_IDS = new Set(["demo-bridge-v1", "demo-graduate-v1"]);

export class DecisionArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecisionArchiveError";
  }
}

function timestamp(now?: string) {
  return now ?? new Date().toISOString();
}

function calendarDate(now?: string) {
  return timestamp(now).slice(0, 10);
}

function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function requireCompletedDecision(session: GameSession) {
  if (session.status !== "completed") {
    throw new DecisionArchiveError(
      "只有完成三幕的决策才能进入长期档案和复盘。"
    );
  }
}

export function isPersonalDecision(session: GameSession) {
  return (
    session.status === "completed" && !FIXED_DEMO_SESSION_IDS.has(session.id)
  );
}

/** Lists local completed decisions newest first. Fixed demo sessions are intentionally excluded. */
export function listDecisionArchives(storage: Storage): GameSession[] {
  return listSessions(storage)
    .filter(isPersonalDecision)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

/** Removes only personal decision sessions, never calibration, reviews, content, or fixed demos. */
export function deleteAllDecisionArchives(storage: Storage) {
  const archives = listDecisionArchives(storage);
  for (const archive of archives) deleteSession(storage, archive.id);
  return archives.length;
}

export function scheduleDecisionReview(
  session: GameSession,
  kind: DecisionReviewKind,
  options: { dueOn?: string; now?: string } = {}
): GameSession {
  requireCompletedDecision(session);
  const createdAt = timestamp(options.now);
  const anchor =
    session.experimentRun?.startedOn ?? calendarDate(session.updatedAt);
  const dueOn =
    kind === "seven_day"
      ? addCalendarDays(anchor, 7)
      : kind === "thirty_day"
        ? addCalendarDays(anchor, 30)
        : options.dueOn;
  if (!dueOn || !/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) {
    throw new DecisionArchiveError("请选择一个有效的复盘日期。");
  }
  if (
    (session.decisionReviews ?? []).some(
      (review) => review.status === "scheduled" && review.dueOn === dueOn
    )
  ) {
    throw new DecisionArchiveError("这个日期已经有一条待复盘记录。");
  }

  return GameSessionSchema.parse({
    ...session,
    decisionReviews: [
      ...(session.decisionReviews ?? []),
      {
        id: `review-${dueOn}-${(session.decisionReviews ?? []).length + 1}`,
        kind,
        dueOn,
        status: "scheduled",
        createdAt
      }
    ],
    updatedAt: createdAt
  });
}

export function completeDecisionReview(
  session: GameSession,
  reviewId: string,
  values: { whatHappened: string; differenceFromThen: string },
  now?: string
): GameSession {
  requireCompletedDecision(session);
  const whatHappened = values.whatHappened.trim();
  const differenceFromThen = values.differenceFromThen.trim();
  if (!whatHappened || !differenceFromThen) {
    throw new DecisionArchiveError(
      "请分别写下后来发生了什么，以及它和当初担心的差异。"
    );
  }
  const review = (session.decisionReviews ?? []).find(
    (item) => item.id === reviewId
  );
  if (!review || review.status !== "scheduled") {
    throw new DecisionArchiveError("这条复盘已经完成或不存在。");
  }
  const completedAt = timestamp(now);
  return GameSessionSchema.parse({
    ...session,
    decisionReviews: (session.decisionReviews ?? []).map((item) =>
      item.id === reviewId
        ? {
            ...item,
            status: "completed",
            completedAt,
            whatHappened,
            differenceFromThen
          }
        : item
    ),
    updatedAt: completedAt
  });
}

export function createDecisionBranch(
  session: GameSession,
  newInformation: string,
  options: { id?: string; now?: string } = {}
): GameSession {
  requireCompletedDecision(session);
  const safeInformation = newInformation.trim();
  if (!safeInformation || safeInformation.length > 600) {
    throw new DecisionArchiveError("请写下一条具体的新信息，再创建分支。");
  }
  const branchedAt = timestamp(options.now);
  const rootSessionId = session.decisionLineage?.rootSessionId ?? session.id;
  const id = options.id ?? `${session.id}-branch-${Date.now()}`;
  if (id === session.id) {
    throw new DecisionArchiveError("分支需要一个新的档案 ID。");
  }

  return GameSessionSchema.parse({
    ...session,
    id,
    ledger: {
      ...session.ledger,
      facts: [...session.ledger.facts, `复盘新增信息：${safeInformation}`]
    },
    decisionLineage: {
      rootSessionId,
      parentSessionId: session.id,
      newInformation: safeInformation,
      branchedAt
    },
    decisionReviews: [],
    updatedAt: branchedAt
  });
}

/** Evidence-grounded observations, not personality labels or outcome predictions. */
export function getDecisionRecordHints(session: GameSession): string[] {
  const hints: string[] = [];
  const run = session.experimentRun;
  const events = run?.events ?? [];
  const skipped = events.filter((event) => event.status === "skipped").length;
  const uncertain = events.filter(
    (event) => event.evidenceSignal === "insufficient"
  ).length;
  const adjustments = run?.adjustments ?? [];

  if (uncertain > 0) {
    hints.push(
      `这次记录里有 ${uncertain} 次保留“信息还不够”；你没有把不确定性硬凑成结论。`
    );
  }
  if (skipped > 0) {
    hints.push(
      `这次有 ${skipped} 天被跳过；回看时可先问：阻碍是临时事件，还是原计划本身过重？`
    );
  }
  if (adjustments.length > 0) {
    hints.push(
      `你根据 ${adjustments.length} 条现实反馈调整过下一步；档案保留了原计划和改动，不把调整误写成一开始就知道。`
    );
  }
  if (session.decisionLineage) {
    hints.push(
      "这是基于新信息创建的分支版本；它保留父版本，方便比较当时依据和后来变化。"
    );
  }
  if (hints.length === 0) {
    hints.push(
      "目前还没有足够的现实记录形成模式提示；先保留这份当时的依据，等复盘时再补信息。"
    );
  }
  return hints.slice(0, 3);
}
