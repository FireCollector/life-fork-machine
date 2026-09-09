import { DemoLauncher } from "@/components/experience/demo-launcher";
import { getPlayableContent } from "@/features/game";

export default async function DemoPage({
  searchParams
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const content = getPlayableContent(scenario);
  return <DemoLauncher scenario={content.scenario} />;
}
