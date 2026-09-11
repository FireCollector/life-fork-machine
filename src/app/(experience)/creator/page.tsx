import type { Metadata } from "next";

import { CreatorStudio } from "@/components/experience/creator-studio";

export const metadata: Metadata = { title: "Creator Studio" };

export default function CreatorPage() {
  return <CreatorStudio />;
}
