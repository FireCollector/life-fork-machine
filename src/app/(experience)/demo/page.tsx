import { DemoLauncher } from "@/components/experience/demo-launcher";
import { demoContent } from "@/features/game";

export default function DemoPage() {
  return <DemoLauncher scenario={demoContent.scenario} />;
}
