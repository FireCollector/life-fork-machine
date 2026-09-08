"use client";

import { Check, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DecisionBrief } from "@/features/game";

type Props = { brief: DecisionBrief; onChange: (brief: DecisionBrief) => void; onConfirm: () => void };

export function DecisionBriefPanel({ brief, onChange, onConfirm }: Props) {
  const editable = brief.safety.status !== "stop";
  function editList(key: "options" | "unknowns" | "assumptions", value: string) {
    onChange({ ...brief, [key]: value.split("\n").map((item) => item.trim()).filter(Boolean) });
  }
  return <section className="glass-panel rounded-3xl border border-white/10 p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-muted-foreground text-xs tracking-[.16em] uppercase">Decision brief / 可编辑确认</p><h2 className="mt-2 text-xl font-semibold">先确认系统有没有理解对</h2></div><span className="rounded-full border border-blue-300/25 bg-blue-300/10 px-3 py-1 text-xs text-blue-200">{brief.safety.status === "stop" ? "不进入推演" : brief.confirmed ? "已确认" : "待确认"}</span></div>
    <p className="text-muted-foreground mt-3 text-sm leading-6">{brief.safety.message}</p>
    {brief.safety.status === "stop" ? <div className="mt-5 flex gap-3 rounded-2xl border border-world-leap/30 bg-world-leap/5 p-4 text-sm text-white/80"><ShieldAlert className="size-5 shrink-0 text-world-leap" />请先处理现实风险；这里不会生成路线、实验或剧情。</div> : <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="text-xs text-muted-foreground">你要比较的选择<textarea className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white" value={brief.options.join("\n")} onChange={(e) => editList("options", e.target.value)} /></label>
      <label className="text-xs text-muted-foreground">仍要核对什么<textarea className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white" value={brief.unknowns.join("\n")} onChange={(e) => editList("unknowns", e.target.value)} /></label>
      <label className="text-xs text-muted-foreground md:col-span-2">你现在默认相信什么<textarea className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white" value={brief.assumptions.join("\n")} onChange={(e) => editList("assumptions", e.target.value)} /></label>
    </div>}
    {brief.clarificationQuestions.length ? <div className="mt-4 rounded-2xl border border-signal-lime/25 bg-signal-lime/5 p-4 text-xs text-white/80">先补充：{brief.clarificationQuestions.join("　")}</div> : null}
    {editable ? <Button className="mt-5" onClick={onConfirm} variant="secondary"><Check />确认这份简报</Button> : null}
  </section>;
}
