"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { GameSessionSchema } from "./schema";
import { LOCAL_GAME_STORAGE_EVENT, sessionStorageKey } from "./storage";

const SERVER_SNAPSHOT = "__server_pending__";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LOCAL_GAME_STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(LOCAL_GAME_STORAGE_EVENT, onStoreChange);
  };
}

export function useStoredSession(sessionId: string) {
  const getSnapshot = useCallback(
    () => window.localStorage.getItem(sessionStorageKey(sessionId)),
    [sessionId]
  );
  const raw = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT
  );

  return useMemo(() => {
    if (raw === SERVER_SNAPSHOT) return { hydrated: false, session: undefined };
    if (!raw) return { hydrated: true, session: undefined };
    try {
      const parsed = GameSessionSchema.safeParse(JSON.parse(raw) as unknown);
      return {
        hydrated: true,
        session:
          parsed.success && parsed.data.id === sessionId
            ? parsed.data
            : undefined
      };
    } catch {
      return { hydrated: true, session: undefined };
    }
  }, [raw, sessionId]);
}
