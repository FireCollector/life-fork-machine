"use client";

import { useMemo, useSyncExternalStore } from "react";

import { CalibrationAnswersSchema } from "./schema";
import { CALIBRATION_STORAGE_KEY } from "./storage";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSnapshot() {
  return window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

export function useStoredCalibration() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    if (!raw) return undefined;
    try {
      const parsed = CalibrationAnswersSchema.safeParse(
        JSON.parse(raw) as unknown
      );
      return parsed.success ? parsed.data : undefined;
    } catch {
      return undefined;
    }
  }, [raw]);
}
