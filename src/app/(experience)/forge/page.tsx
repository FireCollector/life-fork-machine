import type { Metadata } from "next";

import { ForgeExperience } from "@/components/experience/forge-experience";
import { demoContent } from "@/features/game";

export const metadata: Metadata = {
  title: "证据熔炉"
};

export default function ForgePage() {
  return (
    <ForgeExperience
      evidenceRetrievedAt={demoContent.evidenceRetrievedAt}
      scenario={demoContent.scenario}
      sourceCards={demoContent.sourceCards}
    />
  );
}
