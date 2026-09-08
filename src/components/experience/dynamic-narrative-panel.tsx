"use client";

import { useMemo, useState } from "react";
import { Bot, CircleHelp, LoaderCircle, Save, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  narrativeSnapshotKey,
  NarrativeSnapshotSchema,
  type NarrativeSnapshot
} from "@/features/dynamic-narrative";
import type { DecisionBrief } from "@/features/decision-brief";
import type { EvidenceSource } from "@/features/evidence";
import type { CandidateScenarioPack } from "@/features/scenario-candidate";

const STORAGE_KEY = "life-fork-machine:narrative-snapshots:v1";

type NarrativeResponse = {
  snapshot: NarrativeSnapshot;
  validation: { valid: boolean; clueCount: number; provenance: string };
  notice: string;
};

type Props = {
  brief: DecisionBrief;
  pack: CandidateScenarioPack;
  sources: EvidenceSource[];
};

function readSnapshots() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return {} as Record<string, NarrativeSnapshot>;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) => {
        const snapshot = NarrativeSnapshotSchema.safeParse(value);
        return snapshot.success ? [[key, snapshot.data]] : [];
      })
    ) as Record<string, NarrativeSnapshot>;
  } catch {
    return {} as Record<string, NarrativeSnapshot>;
  }
}

function clueStyle(kind: NarrativeSnapshot["clues"][number]["kind"]) {
  if (kind === "support")
    return "border-signal-lime/25 bg-signal-lime/[0.04] text-signal-lime";
  if (kind === "conflict")
    return "border-world-leap/25 bg-world-leap/[0.04] text-world-leap";
  return "border-blue-200/20 bg-blue-200/[0.04] text-blue-200";
}

function clueTitle(kind: NarrativeSnapshot["clues"][number]["kind"]) {
  return (
    { support: "支持线索", conflict: "冲突线索", inconclusive: "暂时不清楚" }[
      kind
    ] ?? kind
  );
}

export function DynamicNarrativePanel({ brief, pack, sources }: Props) {
  const [worldId, setWorldId] = useState(pack.worlds[0].id);
  const [sceneId, setSceneId] = useState(pack.worlds[0].acts[0].id);
  const [actionId, setActionId] = useState(
    pack.worlds[0].acts[0].actions[0].id
  );
  const [snapshots, setSnapshots] = useState<Record<string, NarrativeSnapshot>>(
    () => (typeof window === "undefined" ? {} : readSnapshots())
  );
  const [notice, setNotice] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const world = useMemo(
    () => pack.worlds.find((item) => item.id === worldId) ?? pack.worlds[0],
    [pack.worlds, worldId]
  );
  const scene = useMemo(
    () => world.acts.find((item) => item.id === sceneId) ?? world.acts[0],
    [sceneId, world.acts]
  );
  const action = useMemo(
    () =>
      scene.actions.find((item) => item.id === actionId) ?? scene.actions[0],
    [actionId, scene.actions]
  );
  const context = {
    worldId: world.id,
    sceneId: scene.id,
    actionId: action.id
  };
  const key = narrativeSnapshotKey(brief, pack, context);
  const sourceById = useMemo(
    () => new Map(sources.map((source) => [source.sourceId, source])),
    [sources]
  );

  const snapshot = snapshots[key];

  function chooseWorld(nextWorldId: string) {
    const next =
      pack.worlds.find((item) => item.id === nextWorldId) ?? pack.worlds[0];
    setWorldId(next.id);
    setSceneId(next.acts[0].id);
    setActionId(next.acts[0].actions[0].id);
    setNotice(undefined);
  }

  function chooseScene(nextSceneId: string) {
    const next =
      world.acts.find((item) => item.id === nextSceneId) ?? world.acts[0];
    setSceneId(next.id);
    setActionId(next.actions[0].id);
    setNotice(undefined);
  }

  async function createSnapshot() {
    const saved = snapshots[key];
    if (saved) {
      setNotice("这是这次候选路线已保存的快照；刷新页面也会保持不变。");
      return;
    }
    setIsLoading(true);
    setNotice(undefined);
    try {
      const response = await fetch("/api/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          evidence: { status: "ready", items: sources },
          pack,
          context
        })
      });
      const result = (await response.json()) as
        NarrativeResponse | { message?: string };
      if (!response.ok || !("snapshot" in result)) {
        setNotice(
          "message" in result
            ? (result.message ?? "这一步暂时没有生成。")
            : "这一步暂时没有生成。"
        );
        return;
      }
      const next = result.snapshot;
      const updated = { ...snapshots, [next.key]: next };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSnapshots(updated);
      setNotice(result.notice);
    } catch {
      setNotice("这一步没有保存；你可以稍后再试，已有快照不会受影响。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="dynamic-narrative-title">
      <div className="glass-panel rounded-3xl border border-blue-200/20 p-5 sm:p-7">
        <p className="text-xs tracking-[0.16em] text-blue-200 uppercase">
          Live candidate / 候选动态叙事
        </p>
        <h2
          className="mt-2 text-2xl font-semibold"
          id="dynamic-narrative-title"
        >
          换一条路，问的问题也该变。
        </h2>
        <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-6">
          选一条候选路线和一个小动作。系统只生成这一刻的候选表达：该追问什么、哪些线索支持、冲突或仍不清楚。它不会替你预测后果，也不会写进正式游戏。
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="text-muted-foreground text-xs">
            候选路线
            <select
              className="mt-2 w-full rounded-xl border border-white/[0.1] bg-slate-950 px-3 py-2 text-sm text-white"
              onChange={(event) => chooseWorld(event.target.value)}
              value={world.id}
            >
              {pack.worlds.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-muted-foreground text-xs">
            当前一幕
            <select
              className="mt-2 w-full rounded-xl border border-white/[0.1] bg-slate-950 px-3 py-2 text-sm text-white"
              onChange={(event) => chooseScene(event.target.value)}
              value={scene.id}
            >
              {world.acts.map((item) => (
                <option key={item.id} value={item.id}>
                  第 {item.act} 幕 · {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-muted-foreground text-xs">
            要做的小动作
            <select
              className="mt-2 w-full rounded-xl border border-white/[0.1] bg-slate-950 px-3 py-2 text-sm text-white"
              onChange={(event) => {
                setActionId(event.target.value);
                setNotice(undefined);
              }}
              value={action.id}
            >
              {scene.actions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button className="mt-5" disabled={isLoading} onClick={createSnapshot}>
          {isLoading ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : snapshots[key] ? (
            <Save aria-hidden="true" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {isLoading
            ? "正在生成候选表达"
            : snapshots[key]
              ? "查看已保存快照"
              : "看看这一步该问什么"}
        </Button>
        {notice ? (
          <p className="mt-3 text-xs leading-5 text-white/65" role="status">
            {notice}
          </p>
        ) : null}
      </div>

      {snapshot ? (
        <article className="rounded-3xl border border-white/[0.1] bg-white/[0.025] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Bot aria-hidden="true" className="size-4 text-blue-200" />
              {snapshot.provenance === "ai-assisted"
                ? "AI 候选表达"
                : "规则审核模板"}
            </p>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/60">
              <Save aria-hidden="true" className="mr-1 inline size-3" />
              本机已保存
            </span>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/85">
            {snapshot.narrative}
          </p>
          <div className="mt-5 rounded-2xl border border-blue-200/20 bg-blue-200/[0.04] p-4">
            <p className="flex items-center gap-2 text-xs font-medium text-blue-200">
              <CircleHelp aria-hidden="true" className="size-4" />
              下一句最该问
            </p>
            <p className="mt-2 text-sm font-medium">{snapshot.question.text}</p>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              {snapshot.question.reason}
            </p>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {snapshot.clues.map((clue) => (
              <div
                className={`rounded-2xl border p-4 ${clueStyle(clue.kind)}`}
                key={clue.kind}
              >
                <p className="text-xs font-medium">{clueTitle(clue.kind)}</p>
                <p className="mt-2 text-xs leading-5 text-white/75">
                  {clue.text}
                </p>
                <p className="mt-3 border-t border-white/[0.1] pt-2 text-[11px] text-white/55">
                  来源：{" "}
                  {clue.sourceIds.map((sourceId, index) => {
                    const source = sourceById.get(sourceId);
                    return source ? (
                      <a
                        className="text-blue-200 underline-offset-2 hover:underline"
                        href={source.url}
                        key={sourceId}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {index ? "、" : ""}
                        {source.title}
                      </a>
                    ) : (
                      <span key={sourceId}>
                        {index ? "、" : ""}
                        {sourceId}
                      </span>
                    );
                  })}
                </p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-5 border-t border-white/[0.08] pt-4 text-[11px] leading-5">
            {snapshot.disclosure}
          </p>
        </article>
      ) : null}
    </section>
  );
}
