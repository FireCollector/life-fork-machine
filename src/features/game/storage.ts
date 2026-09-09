import {
  CalibrationAnswersSchema,
  GameSessionSchema,
  type CalibrationAnswers,
  type GameSession
} from "./schema";

export const CALIBRATION_STORAGE_KEY = "life-fork-machine:calibration:v1";
export const SESSION_STORAGE_PREFIX = "life-fork-machine:session:v1:";
export const LOCAL_GAME_STORAGE_EVENT = "life-fork-machine:storage";

function notifyLocalChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LOCAL_GAME_STORAGE_EVENT));
  }
}

export function sessionStorageKey(sessionId: string) {
  return `${SESSION_STORAGE_PREFIX}${sessionId}`;
}

function readJson(
  storage: Pick<Storage, "getItem" | "removeItem">,
  key: string
) {
  const raw = storage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    storage.removeItem(key);
    return undefined;
  }
}

export function saveCalibration(
  storage: Pick<Storage, "setItem">,
  calibration: CalibrationAnswers
) {
  const safeCalibration = CalibrationAnswersSchema.parse(calibration);
  storage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(safeCalibration));
  notifyLocalChange();
}

export function loadCalibration(
  storage: Pick<Storage, "getItem" | "removeItem">
): CalibrationAnswers | undefined {
  const parsed = CalibrationAnswersSchema.safeParse(
    readJson(storage, CALIBRATION_STORAGE_KEY)
  );
  if (parsed.success) return parsed.data;
  storage.removeItem(CALIBRATION_STORAGE_KEY);
  return undefined;
}

export function saveSession(
  storage: Pick<Storage, "setItem">,
  session: GameSession
) {
  const safeSession = GameSessionSchema.parse(session);
  storage.setItem(
    sessionStorageKey(safeSession.id),
    JSON.stringify(safeSession)
  );
  notifyLocalChange();
}

/** Delete exactly one local decision record. This never touches other sessions. */
export function deleteSession(
  storage: Pick<Storage, "removeItem">,
  sessionId: string
) {
  storage.removeItem(sessionStorageKey(sessionId));
  notifyLocalChange();
}

/** Read every valid local game session. Consumers decide which sessions belong in their view. */
export function listSessions(storage: Storage): GameSession[] {
  const sessions: GameSession[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(SESSION_STORAGE_PREFIX)) continue;
    const sessionId = key.slice(SESSION_STORAGE_PREFIX.length);
    const session = loadSession(storage, sessionId);
    if (session) sessions.push(session);
  }
  return sessions;
}

export function loadSession(
  storage: Pick<Storage, "getItem" | "removeItem">,
  sessionId: string
): GameSession | undefined {
  const key = sessionStorageKey(sessionId);
  const raw = readJson(storage, key);
  const parsed = GameSessionSchema.safeParse(
    migrateLegacyExperiment(raw, sessionId)
  );
  if (parsed.success && parsed.data.id === sessionId) return parsed.data;
  storage.removeItem(key);
  return undefined;
}

/**
 * v1 experiment runs predate an explicit mode and date lock. A frozen Demo
 * keeps behaving like a Demo; ordinary in-progress records become real-mode
 * records anchored to their last update rather than silently becoming a fake
 * completed seven-day experiment.
 */
function migrateLegacyExperiment(raw: unknown, sessionId: string) {
  if (!raw || typeof raw !== "object") return raw;
  const candidate = raw as Record<string, unknown>;
  const run = candidate.experimentRun;
  if (!run || typeof run !== "object" || "mode" in run) return raw;
  const updatedAt =
    typeof candidate.updatedAt === "string" ? candidate.updatedAt : undefined;
  const date = updatedAt?.slice(0, 10);
  const isFixedDemo =
    sessionId === "demo-bridge-v1" || sessionId === "demo-graduate-v1";
  return {
    ...candidate,
    experimentRun: {
      ...(run as Record<string, unknown>),
      mode: isFixedDemo ? "demo" : "real",
      ...(isFixedDemo || !date
        ? {}
        : { startedOn: date, nextAvailableOn: date })
    }
  };
}
