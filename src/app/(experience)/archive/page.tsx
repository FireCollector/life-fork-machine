import type { Metadata } from "next";

import { DecisionArchive } from "@/components/experience/decision-archive";

export const metadata: Metadata = {
  title: "决策档案"
};

export default function ArchivePage() {
  return <DecisionArchive />;
}
