"use client";

import { getPlayableContent } from "@/features/game";
import { useStoredSession } from "@/features/game/use-stored-session";

import { PlayExperience } from "./play-experience";
import { ResultPreview } from "./result-preview";

/**
 * A session carries its scenario ID in local storage. Resolve the matching
 * reviewed pack on the client so one `/play/:id` and `/result/:id` route can
 * safely serve every scenario without guessing from a title or URL.
 */
export function PlayScenarioSession({ sessionId }: { sessionId: string }) {
  const { session } = useStoredSession(sessionId);
  const content = getPlayableContent(session?.scenarioId);

  return (
    <PlayExperience
      outcomes={content.outcomes}
      scenario={content.scenario}
      sessionId={sessionId}
      sourceCards={content.sourceCards}
    />
  );
}

export function ResultScenarioSession({ sessionId }: { sessionId: string }) {
  const { session } = useStoredSession(sessionId);
  const content = getPlayableContent(session?.scenarioId);

  return (
    <ResultPreview
      outcomes={content.outcomes}
      scenario={content.scenario}
      sessionId={sessionId}
      sourceCards={content.sourceCards}
    />
  );
}
