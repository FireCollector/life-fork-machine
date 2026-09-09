import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlayScenarioSession } from "@/components/experience/scenario-session-router";

export const metadata: Metadata = {
  title: "三幕推演"
};

export default async function PlayPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) notFound();

  return <PlayScenarioSession sessionId={sessionId} />;
}
