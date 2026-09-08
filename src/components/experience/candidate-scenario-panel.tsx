"use client";

import { FileWarning, GitFork, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CandidateScenarioPack } from "@/features/scenario-candidate";

type Props = {
  pack: CandidateScenarioPack;
  validation: {
    valid: boolean;
    sourceCount: number;
    actCount: number;
    actionCount: number;
  };
};

export function CandidateScenarioPanel({ pack, validation }: Props) {
  return (
    <section className="space-y-4" aria-labelledby="candidate-scenario-title">
      <div className="glass-panel border-world-bridge/25 rounded-3xl border p-5 sm:p-7">
        <p className="text-world-bridge text-xs tracking-[0.16em] uppercase">
          {pack.provenance === "ai-assisted"
            ? "AI candidate scenario pack"
            : "Rules-assisted candidate scenario pack"}
        </p>
        <h2
          className="mt-2 text-2xl font-semibold"
          id="candidate-scenario-title"
        >
          三条路已经有了草稿，但还不能直接开演。
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          这是用于审核的候选场景：每条世界线都有三幕和可执行动作，但它不是预测，也不会写入正式游戏。来源、动作预算和退出规则都要由编辑确认。
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/65">
          <span className="rounded-full border border-white/10 px-3 py-1">
            {validation.sourceCount} 条来源
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            {validation.actCount} 幕
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            {validation.actionCount} 个动作
          </span>
          <span
            className={`rounded-full border px-3 py-1 ${validation.valid ? "border-signal-lime/30 text-signal-lime" : "border-world-leap/30 text-world-leap"}`}
          >
            {validation.valid ? "结构校验通过" : "结构需要修复"}
          </span>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {pack.worlds.map((world) => (
          <article
            className="rounded-3xl border border-white/[0.1] bg-white/[0.025] p-5"
            key={world.id}
          >
            <div className="flex items-center gap-2">
              <GitFork aria-hidden="true" className="size-4 text-blue-200" />
              <h3 className="font-semibold">{world.label}</h3>
            </div>
            <p className="mt-3 text-xs leading-5 text-white/80">
              取舍：{world.tradeoff.text}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              还要核对：{world.unknownToVerify.text}
            </p>
            <ol className="mt-4 space-y-3">
              {world.acts.map((scene) => (
                <li
                  className="border-t border-white/[0.08] pt-3"
                  key={scene.id}
                >
                  <p className="text-xs font-medium">
                    第 {scene.act} 幕 · {scene.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-white/60">
                    {scene.premise}
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-white/75">
                    {scene.actions.map((action) => (
                      <li key={action.id}>
                        · {action.label}（{action.timeBudgetMinutes} 分钟 / ¥
                        {action.moneyBudgetCny}）
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
      <div className="border-world-leap/25 bg-world-leap/[0.04] rounded-3xl border p-5 sm:p-6">
        <p className="text-world-leap flex items-center gap-2 text-sm font-medium">
          <FileWarning aria-hidden="true" className="size-4" />
          发布门禁仍然关闭
        </p>
        <ul className="mt-3 space-y-1.5 text-xs leading-5 text-white/70">
          {pack.review.blockers.map((blocker) => (
            <li key={blocker}>· {blocker}</li>
          ))}
        </ul>
        <Button className="mt-4" disabled size="sm" variant="secondary">
          <LockKeyhole aria-hidden="true" />
          需人工审核后才能发布
        </Button>
      </div>
    </section>
  );
}
