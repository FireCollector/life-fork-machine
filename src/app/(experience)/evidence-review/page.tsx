import type { Metadata } from "next";

import { EvidenceReviewWorkbench } from "@/components/experience/evidence-review-workbench";

export const metadata: Metadata = {
  title: "素材审核"
};

export default function EvidenceReviewPage() {
  return <EvidenceReviewWorkbench />;
}

