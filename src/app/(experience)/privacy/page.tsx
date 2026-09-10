"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import { PageFrame } from "@/components/experience/page-frame";
import { Button } from "@/components/ui/button";
import { listDecisionArchives } from "@/features/game/decision-archive";
import { GameSessionSchema, type GameSession } from "@/features/game/schema";
import { saveSession } from "@/features/game/storage";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type CloudDecision = {
  client_session_id: string;
  payload: unknown;
  updated_at: string;
};

function parseCloudSessions(rows: CloudDecision[]) {
  return rows.flatMap((row) => {
    const session = GameSessionSchema.safeParse(row.payload);
    return session.success && session.data.id === row.client_session_id
      ? [session.data]
      : [];
  });
}

function mergeCloudSessions(local: GameSession[], cloud: GameSession[]) {
  const localById = new Map(local.map((session) => [session.id, session]));
  let restored = 0;
  for (const session of cloud) {
    const current = localById.get(session.id);
    if (!current || session.updatedAt > current.updatedAt) {
      saveSession(window.localStorage, session);
      restored += 1;
    }
  }
  return restored;
}

export default function PrivacyPage() {
  const client = useMemo(() => getBrowserSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState(
    "匿名模式下，所有决策只保存在当前浏览器。"
  );
  const [pending, setPending] = useState(false);
  const [localCount, setLocalCount] = useState(() =>
    typeof window === "undefined"
      ? 0
      : listDecisionArchives(window.localStorage).length
  );

  function refreshLocalCount() {
    setLocalCount(listDecisionArchives(window.localStorage).length);
  }

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

  async function requestLink() {
    if (!client) {
      setMessage("云端同步尚未配置，本地体验不受影响。");
      return;
    }
    setPending(true);
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/privacy` }
    });
    setPending(false);
    setMessage(
      error
        ? "登录链接暂未发送。请检查邮箱地址和 Supabase Auth 的站点地址设置。"
        : "登录链接已发送。验证后回到这里，再由你决定是否同步本地档案。"
    );
  }

  async function syncLocalRecords() {
    if (!client || !user) return;
    const sessions = listDecisionArchives(window.localStorage);
    if (!sessions.length) {
      setMessage("当前浏览器还没有可同步的已完成决策。先完成一次推演即可。");
      return;
    }
    setPending(true);
    const { error } = await client.from("decision_sessions").upsert(
      sessions.map((session) => ({
        owner_id: user.id,
        client_session_id: session.id,
        payload: session,
        scenario_version: session.scenarioId,
        updated_at: session.updatedAt
      })),
      { onConflict: "owner_id,client_session_id" }
    );
    setPending(false);
    setMessage(
      error
        ? "同步未完成：请先在 Supabase SQL Editor 执行项目中的迁移脚本。"
        : `已按你的确认同步 ${sessions.length} 条档案；本地副本仍保留。`
    );
  }

  async function restoreCloudRecords() {
    if (!client || !user) return;
    setPending(true);
    const { data, error } = await client
      .from("decision_sessions")
      .select("client_session_id,payload,updated_at")
      .eq("owner_id", user.id);
    setPending(false);
    if (error) {
      setMessage("恢复未完成：请确认已执行 Supabase 迁移脚本。");
      return;
    }
    const restored = mergeCloudSessions(
      listDecisionArchives(window.localStorage),
      parseCloudSessions((data ?? []) as CloudDecision[])
    );
    refreshLocalCount();
    setMessage(
      restored
        ? `已恢复 ${restored} 条较新的云端档案；本地较新的版本没有被覆盖。`
        : "没有发现比本地更新的云端档案。"
    );
  }

  async function clearCloudCopies() {
    if (!client || !user) return;
    setPending(true);
    const { error } = await client
      .from("decision_sessions")
      .delete()
      .eq("owner_id", user.id);
    setPending(false);
    setMessage(
      error
        ? "云端副本未清除：请确认已执行 Supabase 迁移脚本。"
        : "云端副本已清除；当前浏览器里的本地档案完全不受影响。"
    );
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    setMessage("已退出云端同步；本地档案仍只保存在这个浏览器。");
  }

  return (
    <PageFrame
      eyebrow="PRIVACY CENTER / TASK-044"
      title="你的记录，默认只留在这里。"
      description="不登录也能完整体验。登录只用于你主动同步和跨设备恢复，绝不会自动上传本地档案。"
    >
      <section className="glass-panel mx-auto max-w-2xl rounded-3xl border border-white/10 p-6">
        {user ? (
          <div>
            <p className="text-sm text-emerald-300">已登录：{user.email}</p>
            <h2 className="mt-3 text-xl font-semibold">
              你决定是否把记录带上云端
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/65">
              当前浏览器有 {localCount}{" "}
              条可同步的已完成档案。点击同步前，它们不会离开本地；同步后，本地副本依然保留。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button disabled={pending} onClick={syncLocalRecords}>
                同步这 {localCount} 条本地档案
              </Button>
              <Button
                disabled={pending}
                onClick={restoreCloudRecords}
                variant="outline"
              >
                恢复云端较新版本
              </Button>
              <Button disabled={pending} onClick={signOut} variant="ghost">
                退出登录
              </Button>
            </div>
            <div className="mt-7 border-t border-white/10 pt-5">
              <p className="text-xs leading-5 text-white/55">
                清除只会删除云端副本，不会动这个浏览器的本地档案。账号删除需要在
                Supabase 的账户管理中完成。
              </p>
              <Button
                className="mt-3"
                disabled={pending}
                onClick={clearCloudCopies}
                variant="destructive"
              >
                清除云端副本
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold">登录后再同步</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">
              输入邮箱后会收到一次性登录链接。验证成功前，本地档案不会上传。
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
              onClick={requestLink}
            >
              发送登录链接
            </Button>
          </div>
        )}
        <p className="mt-5 text-xs leading-5 text-white/60">{message}</p>
      </section>
    </PageFrame>
  );
}
