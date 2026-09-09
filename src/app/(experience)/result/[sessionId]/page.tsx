import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResultScenarioSession } from "@/components/experience/scenario-session-router";

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

  return <ResultScenarioSession sessionId={sessionId} />;
}
