import type { Metadata } from "next";

import { CalibrationFlow } from "@/components/experience/calibration-flow";
import { getPlayableContent } from "@/features/game";

export const metadata: Metadata = {
  title: "约束校准"
};

export default async function CalibratePage({
  searchParams
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const content = getPlayableContent(scenario);
  return <CalibrationFlow scenarioId={content.scenario.scenarioId} />;
}
