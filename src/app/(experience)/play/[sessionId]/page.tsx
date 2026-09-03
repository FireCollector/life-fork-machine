import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlayExperience } from "@/components/experience/play-experience";
import { demoContent } from "@/features/game";

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

  return (
    <PlayExperience
      outcomes={demoContent.outcomes}
      scenario={demoContent.scenario}
      sessionId={sessionId}
      sourceCards={demoContent.sourceCards}
    />
  );
}
