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

export function loadSession(
  storage: Pick<Storage, "getItem" | "removeItem">,
  sessionId: string
): GameSession | undefined {
  const key = sessionStorageKey(sessionId);
  const parsed = GameSessionSchema.safeParse(readJson(storage, key));
  if (parsed.success && parsed.data.id === sessionId) return parsed.data;
  storage.removeItem(key);
  return undefined;
}
