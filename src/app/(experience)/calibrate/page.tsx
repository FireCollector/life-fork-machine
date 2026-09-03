import type { Metadata } from "next";

import { CalibrationFlow } from "@/components/experience/calibration-flow";

export const metadata: Metadata = {
  title: "约束校准"
};

export default function CalibratePage() {
  return <CalibrationFlow />;
}
