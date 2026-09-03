import { beforeEach, describe, expect, it } from "vitest";

import {
  CALIBRATION_STORAGE_KEY,
  SESSION_STORAGE_PREFIX,
  createSession,
  demoContent,
  loadCalibration,
  loadSession,
  saveCalibration,
  saveSession,
  selectWorld,
  type CalibrationAnswers
} from "../src/features/game";

const calibration: CalibrationAnswers = {
  runway: "6-12",
  sharedRisk: "self",
  primaryFear: "miss-opportunity",
  primaryGoal: "growth",
  uncertaintyStyle: "validate-first"
};

describe("D03 local demo storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips a validated calibration", () => {
    saveCalibration(window.localStorage, calibration);
    expect(loadCalibration(window.localStorage)).toEqual(calibration);
  });

  it("removes invalid calibration data instead of leaking it into a session", () => {
    window.localStorage.setItem(CALIBRATION_STORAGE_KEY, "{broken-json");
    expect(loadCalibration(window.localStorage)).toBeUndefined();
    expect(window.localStorage.getItem(CALIBRATION_STORAGE_KEY)).toBeNull();
  });

  it("stores each anonymous session under a versioned per-session key", () => {
    const session = selectWorld(
      createSession(calibration, demoContent.scenario, {
        id: "stored-session",
        seed: 7,
        now: "2026-09-01T10:00:00.000Z"
      }),
      demoContent.scenario,
      "bridge",
      "2026-09-01T10:00:00.000Z"
    );

    saveSession(window.localStorage, session);
    expect(loadSession(window.localStorage, session.id)).toEqual(session);
    expect(
      window.localStorage.getItem(`${SESSION_STORAGE_PREFIX}${session.id}`)
    ).not.toBeNull();
  });
});
