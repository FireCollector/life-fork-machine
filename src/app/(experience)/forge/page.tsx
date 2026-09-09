import type { Metadata } from "next";

import { ForgeExperience } from "@/components/experience/forge-experience";
import { getPlayableContent } from "@/features/game";

export const metadata: Metadata = {
  title: "证据熔炉"
};

export default async function ForgePage({
  searchParams
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const content = getPlayableContent(scenario);
  return (
    <ForgeExperience
      evidenceRetrievedAt={content.evidenceRetrievedAt}
      scenario={content.scenario}
      sourceCards={content.sourceCards}
    />
  );
}
