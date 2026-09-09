import type { CalibrationAnswers } from "./schema";

export const DEMO_SESSION_ID = "demo-bridge-v1";
export const DEMO_SEED = 20260902;
export const DEMO_CREATED_AT = "2026-09-02T04:00:00.000Z";

export const DEMO_CALIBRATION: CalibrationAnswers = {
  runway: "12-24",
  sharedRisk: "partner",
  primaryFear: "financial-loss",
  primaryGoal: "autonomy",
  uncertaintyStyle: "validate-first"
};

export const DEMO_ROUTE = {
  worldId: "bridge" as const,
  actionIds: [
    "bridge-1-evidence-sprint",
    "bridge-2-conditional-join",
    "bridge-3-validated-join"
  ],
  assumptionId: "equity-promise-breaks"
} as const;

export const GRADUATE_DEMO_SESSION_ID = "demo-graduate-v1";
export const GRADUATE_DEMO_SEED = 20260909;
export const GRADUATE_DEMO_CREATED_AT = "2026-09-09T04:00:00.000Z";

export const GRADUATE_DEMO_CALIBRATION: CalibrationAnswers = {
  runway: "6-12",
  sharedRisk: "self",
  primaryFear: "growth-stagnation",
  primaryGoal: "growth",
  uncertaintyStyle: "validate-first"
};

export const GRADUATE_DEMO_ROUTE = {
  worldId: "dual-track",
  actionIds: [
    "bridge-1-admissions-audit",
    "bridge-2-one-page-plan",
    "bridge-3-submit-while-working"
  ],
  assumptionId: "degree-opens-door"
} as const;
