"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PageFrame } from "@/components/experience/page-frame";
import {
  DEMO_CALIBRATION,
  DEMO_CREATED_AT,
  DEMO_ROUTE,
  DEMO_SEED,
  DEMO_SESSION_ID,
  GRADUATE_DEMO_CALIBRATION,
  GRADUATE_DEMO_CREATED_AT,
  GRADUATE_DEMO_ROUTE,
  GRADUATE_DEMO_SEED,
  GRADUATE_DEMO_SESSION_ID
} from "@/features/game/demo-route";
import {
  createSession,
  saveCalibration,
  saveSession,
  selectWorld,
  type Scenario
} from "@/features/game";

const demoPresets = {
  startup: {
    calibration: DEMO_CALIBRATION,
    createdAt: DEMO_CREATED_AT,
    route: DEMO_ROUTE,
    seed: DEMO_SEED,
    sessionId: DEMO_SESSION_ID,
    label: "搭桥试水"
  },
  "graduate-school": {
    calibration: GRADUATE_DEMO_CALIBRATION,
    createdAt: GRADUATE_DEMO_CREATED_AT,
    route: GRADUATE_DEMO_ROUTE,
    seed: GRADUATE_DEMO_SEED,
    sessionId: GRADUATE_DEMO_SESSION_ID,
    label: "在职验证"
  }
} as const;

export function DemoLauncher({ scenario }: { scenario: Scenario }) {
  const router = useRouter();
  const preset =
    demoPresets[scenario.scenarioId as keyof typeof demoPresets] ??
    demoPresets.startup;

  useEffect(() => {
    saveCalibration(window.localStorage, preset.calibration);
    const session = selectWorld(
      createSession(preset.calibration, scenario, {
        id: preset.sessionId,
        seed: preset.seed,
        now: preset.createdAt
      }),
      scenario,
      preset.route.worldId,
      preset.createdAt
    );
    saveSession(window.localStorage, session);
    router.replace(`/play/${preset.sessionId}`);
  }, [preset, router, scenario]);

  return (
    <PageFrame
      description="正在装入固定校准、搭桥世界和可重复的演示种子。每次从此入口进入，都会得到相同起点。"
      eyebrow="DEMO / FIXED ROUTE"
      step={3}
      title="正在准备 90 秒推荐路线…"
    >
      <div
        aria-live="polite"
        className="glass-panel flex min-h-72 items-center justify-center rounded-3xl border border-white/10"
      >
        <div className="text-center">
          <div aria-hidden="true" className="relative mx-auto mb-6 size-16">
            <span className="border-zhihu/35 loading-orbit absolute inset-0 rounded-full border border-dashed" />
            <span className="border-world-bridge/40 loading-orbit loading-orbit--reverse absolute inset-3 rounded-full border" />
            <span className="bg-zhihu shadow-blue absolute inset-6 rounded-full" />
          </div>
          <p className="text-sm font-medium">
            {preset.label} · 固定种子 {preset.seed}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            本入口只用于稳定演示，不改变正式体验路径。
          </p>
        </div>
      </div>
    </PageFrame>
  );
}
