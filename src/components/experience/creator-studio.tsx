"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { History, Send, Upload } from "lucide-react";

import { PageFrame } from "@/components/experience/page-frame";
import { Button } from "@/components/ui/button";
import {
  CreatorRoleSchema,
  canTransition,
  summarizePackChanges,
  validateCreatorDraft,
  type CreatorRole,
  type ScenarioPublicationStatus
} from "@/features/creator-studio";
import { EvidenceSourceSchema, type EvidenceSource } from "@/features/evidence";
import {
  CandidateScenarioPackSchema,
  type CandidateScenarioPack
} from "@/features/scenario-candidate";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

const CREATOR_HANDOFF_KEY = "life-fork-machine:creator-import:v1";

type CreatorHandoff = {
  pack: CandidateScenarioPack;
  sources: EvidenceSource[];
};

type StoredVersion = {
  id: string;
  scenario_key: string;
  version: number;
  status: ScenarioPublicationStatus;
  title: string;
  source_snapshot: unknown;
  original_pack: unknown;
  editor_pack: unknown;
  validation: unknown;
  change_reason: string;
  created_at: string;
  published_at: string | null;
  retired_at: string | null;
};

function readCreatorHandoff(): CreatorHandoff | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(CREATOR_HANDOFF_KEY);
  if (!raw) return undefined;
  window.localStorage.removeItem(CREATOR_HANDOFF_KEY);
  try {
    const value = JSON.parse(raw) as { pack?: unknown; sources?: unknown };
    return {
      pack: CandidateScenarioPackSchema.parse(value.pack),
      sources: EvidenceSourceSchema.array().min(3).max(12).parse(value.sources)
    };
  } catch {
    return undefined;
  }
}

function displayStatus(status: ScenarioPublicationStatus) {
  return (
    {
      draft: "草稿",
      in_review: "审核中",
      published: "已发布",
      retired: "已下线"
    }[status] ?? status
  );
}

function nextAction(status: ScenarioPublicationStatus, role: CreatorRole) {
  if (canTransition(role, status, "in_review"))
    return { status: "in_review" as const, label: "提交审核" };
  if (canTransition(role, status, "published"))
    return { status: "published" as const, label: "发布这一版" };
  if (canTransition(role, status, "retired"))
    return { status: "retired" as const, label: "下线这一版" };
  return undefined;
}

export function CreatorStudio() {
  const client = useMemo(() => getBrowserSupabaseClient(), []);
  const [handoff] = useState(readCreatorHandoff);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<CreatorRole>();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    handoff
      ? "已带入议题实验室的候选场景和来源快照。请先检查，再保存草稿。"
      : "从议题实验室生成候选场景后，可一键交给这里审核；也可打开历史版本。"
  );
  const [pending, setPending] = useState(false);
  const [versions, setVersions] = useState<StoredVersion[]>([]);
  const [selected, setSelected] = useState<StoredVersion>();
  const [scenarioKey, setScenarioKey] = useState("new-scenario");
  const [reason, setReason] = useState("补充人工审核和来源核对。");
  const [originalPack, setOriginalPack] = useState<
    CandidateScenarioPack | undefined
  >(handoff?.pack);
  const [editorText, setEditorText] = useState(() =>
    handoff ? JSON.stringify(handoff.pack, null, 2) : ""
  );
  const [sourceSnapshot, setSourceSnapshot] = useState<EvidenceSource[]>(
    handoff?.sources ?? []
  );

  const editorPack = useMemo(() => {
    try {
      return CandidateScenarioPackSchema.parse(JSON.parse(editorText));
    } catch {
      return undefined;
    }
  }, [editorText]);
  const validation = useMemo(
    () =>
      originalPack && editorPack
        ? validateCreatorDraft({
            scenarioKey,
            changeReason: reason,
            sourceSnapshot,
            originalPack,
            editorPack
          })
        : {
            valid: false,
            issues: ["请先导入一个完整的候选场景。"],
            summary: null
          },
    [editorPack, originalPack, reason, scenarioKey, sourceSnapshot]
  );
  const changes = useMemo(
    () =>
      originalPack && editorPack
        ? summarizePackChanges(originalPack, editorPack)
        : [],
    [editorPack, originalPack]
  );

  useEffect(() => {
    if (!client) return;
    void client.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!client || !user) return;
    void (async () => {
      const [roleResult, versionsResult] = await Promise.all([
        client
          .from("creator_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle(),
        client
          .from("scenario_versions")
          .select("*")
          .order("updated_at", { ascending: false })
      ]);
      const parsedRole = CreatorRoleSchema.safeParse(roleResult.data?.role);
      setRole(parsedRole.success ? parsedRole.data : undefined);
      if (versionsResult.error) {
        setMessage(
          "Creator Studio 数据表或权限尚未启用；请执行 TASK-045 的 Supabase 迁移。"
        );
        return;
      }
      setVersions((versionsResult.data ?? []) as StoredVersion[]);
    })();
  }, [client, user]);

  async function requestLogin() {
    if (!client) return;
    setPending(true);
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/creator` }
    });
    setPending(false);
    setMessage(
      error
        ? "登录链接未发送，请检查 Supabase 的邮箱登录和站点地址设置。"
        : "登录链接已发送。验证后会依据你的 Creator 角色决定可执行操作。"
    );
  }

  function openVersion(version: StoredVersion) {
    const original = CandidateScenarioPackSchema.safeParse(
      version.original_pack
    );
    const edited = CandidateScenarioPackSchema.safeParse(version.editor_pack);
    const sources = EvidenceSourceSchema.array().safeParse(
      version.source_snapshot
    );
    if (!original.success || !edited.success || !sources.success) {
      setMessage("这条历史版本结构不完整，不能安全打开编辑。");
      return;
    }
    setSelected(version);
    setScenarioKey(version.scenario_key);
    setReason(version.change_reason);
    setOriginalPack(original.data);
    setEditorText(JSON.stringify(edited.data, null, 2));
    setSourceSnapshot(sources.data);
    setMessage(
      `已打开 ${version.scenario_key} v${version.version}，历史发布版只能查看或复制为新草稿。`
    );
  }

  function startNewVersion(version: StoredVersion) {
    openVersion(version);
    setSelected(undefined);
    setReason(`基于 v${version.version} 创建新版本，原因：`);
    setMessage("已复制为新草稿；不会回写或篡改历史版本。");
  }

  async function saveDraft() {
    if (!client || !user || !role || !originalPack || !editorPack) return;
    if (!validation.valid) {
      setMessage(`不能保存：${validation.issues[0]}`);
      return;
    }
    setPending(true);
    const base = {
      title: editorPack.title,
      source_snapshot: sourceSnapshot,
      original_pack: originalPack,
      editor_pack: editorPack,
      validation,
      change_reason: reason
    };
    if (selected) {
      const { error } = await client
        .from("scenario_versions")
        .update(base)
        .eq("id", selected.id);
      setPending(false);
      setMessage(
        error
          ? "保存失败：该版本可能已发布、下线或无编辑权限。"
          : "草稿已保存，历史发布版本没有改变。"
      );
      return;
    }
    const knownVersions = versions.filter(
      (item) => item.scenario_key === scenarioKey
    );
    const nextVersion =
      Math.max(0, ...knownVersions.map((item) => item.version)) + 1;
    const { data, error } = await client
      .from("scenario_versions")
      .insert({
        ...base,
        scenario_key: scenarioKey,
        version: nextVersion,
        status: "draft",
        created_by: user.id
      })
      .select()
      .single();
    setPending(false);
    if (error) {
      setMessage(
        "新草稿未保存：请确认你有 Creator 角色，或换一个内容标识后重试。"
      );
      return;
    }
    const stored = data as StoredVersion;
    setSelected(stored);
    setVersions((current) => [stored, ...current]);
    setMessage(`已创建 ${scenarioKey} v${nextVersion} 草稿。`);
  }

  async function transition(next: ScenarioPublicationStatus) {
    if (!client || !selected || !role) return;
    if (!canTransition(role, selected.status, next)) {
      setMessage("当前角色没有执行这个发布状态变更的权限。");
      return;
    }
    if (next === "published" && !validation.valid) {
      setMessage(`不能发布：${validation.issues[0]}`);
      return;
    }
    setPending(true);
    const { data, error } = await client
      .from("scenario_versions")
      .update({ status: next, change_reason: reason, validation })
      .eq("id", selected.id)
      .select()
      .single();
    setPending(false);
    if (error) {
      setMessage("状态变更失败：请确认角色、迁移和版本当前状态。 ");
      return;
    }
    const updated = data as StoredVersion;
    setSelected(updated);
    setVersions((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
    setMessage(
      `已${displayStatus(next)}。操作人、时间和原因已写入发布审计记录。`
    );
  }

  const action =
    selected && role ? nextAction(selected.status, role) : undefined;

  return (
    <PageFrame
      actions={
        <Button asChild size="sm" variant="ghost">
          <Link href="/topic-lab">回到议题实验室</Link>
        </Button>
      }
      description="候选内容先经过结构、引用与人工审核，再成为版本化内容。发布不会回写任何已经开始的用户会话。"
      eyebrow="CREATOR STUDIO / TASK-045"
      title="把候选世界线，变成可追溯的内容版本。"
    >
      {!user ? (
        <section className="glass-panel mx-auto max-w-xl rounded-3xl border border-white/10 p-6">
          <h2 className="text-xl font-semibold">先登录 Creator Studio</h2>
          <p className="mt-3 text-sm leading-6 text-white/65">
            登录不自动授予内容权限；管理员分配 Creator 角色后才能读写场景版本。
          </p>
          <input
            className="mt-5 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
          <Button
            className="mt-3"
            disabled={!email || pending}
            onClick={requestLogin}
          >
            发送登录链接
          </Button>
          <p className="mt-4 text-xs text-white/60">{message}</p>
        </section>
      ) : !role ? (
        <section className="glass-panel mx-auto max-w-xl rounded-3xl border border-amber-300/20 p-6">
          <h2 className="text-xl font-semibold">等待 Creator 授权</h2>
          <p className="mt-3 text-sm leading-6 text-white/65">
            你已登录为 {user.email}
            ，但还没有编辑、发布或管理员角色。请让管理员按项目文档中的 SQL
            为此账号分配角色。
          </p>
          <p className="mt-4 text-xs text-white/60">{message}</p>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <aside className="glass-panel h-fit rounded-3xl border border-white/10 p-5 xl:sticky xl:top-24">
            <p className="text-xs tracking-[0.16em] text-emerald-300 uppercase">
              {role} workspace
            </p>
            <h2 className="mt-2 text-xl font-semibold">内容版本</h2>
            <p className="mt-2 text-xs leading-5 text-white/60">
              发布后的版本不可编辑。需要回退时，复制历史版本并创建新草稿。
            </p>
            <div className="mt-5 space-y-2">
              {versions.length ? (
                versions.map((version) => (
                  <button
                    className="w-full rounded-2xl border border-white/10 p-3 text-left hover:border-blue-300/45"
                    key={version.id}
                    onClick={() => openVersion(version)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {version.title}
                      </span>
                      <span className="text-xs text-blue-200">
                        {displayStatus(version.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/55">
                      {version.scenario_key} · v{version.version}
                    </p>
                  </button>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-4 text-xs leading-5 text-white/55">
                  还没有云端版本。请从议题实验室带入候选场景。
                </p>
              )}
            </div>
          </aside>
          <section className="space-y-6">
            <div className="glass-panel rounded-3xl border border-white/10 p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs tracking-[0.16em] text-blue-200 uppercase">
                    Editable candidate
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    编辑前先留住 AI 初稿
                  </h2>
                </div>
                {selected ? (
                  <Button
                    onClick={() => startNewVersion(selected)}
                    size="sm"
                    variant="outline"
                  >
                    <History />
                    基于此版新建草稿
                  </Button>
                ) : null}
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-xs text-white/60">
                  内容标识
                  <input
                    className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white"
                    disabled={Boolean(selected)}
                    onChange={(event) => setScenarioKey(event.target.value)}
                    value={scenarioKey}
                  />
                </label>
                <label className="text-xs text-white/60">
                  本次修改原因
                  <textarea
                    className="mt-2 min-h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    maxLength={240}
                    onChange={(event) => setReason(event.target.value)}
                    value={reason}
                  />
                </label>
              </div>
              <label className="mt-5 block text-xs text-white/60">
                Candidate ScenarioPack JSON
                <textarea
                  className="mt-2 min-h-96 w-full rounded-2xl border border-white/10 bg-black/20 p-3 font-mono text-xs leading-5 text-white"
                  onChange={(event) => setEditorText(event.target.value)}
                  spellCheck={false}
                  value={editorText}
                />
              </label>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  disabled={pending || !validation.valid}
                  onClick={saveDraft}
                >
                  <Upload />
                  {selected ? "保存工作版本" : "创建云端草稿"}
                </Button>
                {action ? (
                  <Button
                    disabled={
                      pending ||
                      (action.status === "published" && !validation.valid)
                    }
                    onClick={() => transition(action.status)}
                    variant="secondary"
                  >
                    <Send />
                    {action.label}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-signal-lime text-xs tracking-[0.16em] uppercase">
                  Validation gate
                </p>
                <h3 className="mt-2 text-lg font-semibold">发布前检查</h3>
                {validation.summary ? (
                  <p className="mt-3 text-sm text-white/70">
                    {validation.summary.worlds} 条世界线 ·{" "}
                    {validation.summary.acts} 幕 · {validation.summary.actions}{" "}
                    个行动 · {validation.summary.sources} 条来源
                  </p>
                ) : null}
                <ul className="mt-4 space-y-2 text-sm text-white/65">
                  {validation.valid ? (
                    <li className="text-emerald-300">
                      结构、来源快照、引用与重复项检查通过。
                    </li>
                  ) : (
                    validation.issues.map((issue) => (
                      <li key={issue}>• {issue}</li>
                    ))
                  )}
                </ul>
                <p className="mt-4 text-xs leading-5 text-white/50">
                  来源快照保留标题、作者、链接和检索时间；失效链接会在后续运营巡检中重新核验，而不会偷偷替换原引用。
                </p>
              </section>
              <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-world-bridge text-xs tracking-[0.16em] uppercase">
                  AI draft / human changes
                </p>
                <h3 className="mt-2 text-lg font-semibold">人工改了什么</h3>
                {changes.length ? (
                  <ul className="mt-4 space-y-3 text-xs leading-5 text-white/65">
                    {changes.map((change) => (
                      <li key={`${change.path}-${change.after}`}>
                        <p className="text-blue-200">
                          {change.path || "根节点"}
                        </p>
                        <p>
                          <span className="text-white/40">原：</span>
                          {change.before}
                        </p>
                        <p>
                          <span className="text-white/40">改：</span>
                          {change.after}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-white/60">
                    尚未修改 AI/规则初稿。任何编辑都会在这里显示字段级差异。
                  </p>
                )}
              </section>
            </div>
            {selected ? (
              <section className="rounded-3xl border border-white/10 p-5">
                <p className="text-xs tracking-[0.16em] text-white/50 uppercase">
                  Selected version
                </p>
                <p className="mt-2 text-sm text-white/70">
                  {selected.scenario_key} · v{selected.version} ·{" "}
                  {displayStatus(selected.status)} · 创建于{" "}
                  {new Date(selected.created_at).toLocaleString("zh-CN")}
                </p>
                {selected.status === "published" ||
                selected.status === "retired" ? (
                  <p className="mt-3 text-xs text-amber-200">
                    这版内容已冻结。需要修订时请使用“基于此版新建草稿”。
                  </p>
                ) : null}
              </section>
            ) : null}
            <p className="text-xs text-white/55" role="status">
              {message}
            </p>
          </section>
        </div>
      )}
    </PageFrame>
  );
}
