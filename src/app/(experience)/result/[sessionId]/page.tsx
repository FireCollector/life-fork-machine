import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResultPreview } from "@/components/experience/result-preview";
import { demoContent } from "@/features/game";

export const metadata: Metadata = {
  title: "代价报告"
};

export default async function ResultPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) notFound();

  return (
    <ResultPreview
      outcomes={demoContent.outcomes}
      scenario={demoContent.scenario}
      sessionId={sessionId}
      sourceCards={demoContent.sourceCards}
    />
  );
}
