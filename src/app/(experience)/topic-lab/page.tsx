import type { Metadata } from "next";

import { TopicLab } from "@/components/experience/topic-lab";

export const metadata: Metadata = {
  title: "议题实验室"
};

export default function TopicLabPage() {
  return <TopicLab />;
}
