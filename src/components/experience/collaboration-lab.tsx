"use client";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { Clipboard, Link2, ShieldCheck } from "lucide-react";
import { PageFrame } from "@/components/experience/page-frame";
import { Button } from "@/components/ui/button";
import {
  createCollaborationLink,
  formatContribution,
  parseCollaborationInvite,
  type CollaborationInvite
} from "@/features/collaboration";

const sample: CollaborationInvite = {
  version: 1,
  topic: "一次现实选择",
  question: "你认为我最该先核对的一个条件是什么？",
  expiresOn: "2026-10-10",
  context: [
    "我正在比较两条可逆的选择。",
    "请只补充这一件事，不需要了解完整报告。"
  ]
};
export function CollaborationLab() {
  const subscribe = useCallback(() => () => undefined, []);
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => ""
  );
  const invite = useMemo(() => parseCollaborationInvite(hash), [hash]);
  const [kind, setKind] = useState<"fact" | "view" | "support">("fact");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const active = invite ?? sample;
  async function copyInvite() {
    await navigator.clipboard.writeText(
      createCollaborationLink(active, window.location.origin)
    );
    setCopied(true);
  }
  async function copyReply() {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(formatContribution({ kind, text }));
    setCopied(true);
  }
  return (
    <PageFrame
      eyebrow="CONTROLLED COLLABORATION / TASK-043"
      title="只请一个人，回答一个具体问题。"
      description="分享链接只携带下方白名单上下文；没有完整报告、账号、档案、实验备注或其他页面权限。"
    >
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
        <section className="glass-panel rounded-3xl border border-white/10 p-6">
          <p className="text-xs text-blue-200 uppercase">邀请卡</p>
          <h2 className="mt-2 text-xl font-semibold">{active.question}</h2>
          <p className="mt-4 text-sm text-white/70">允许看到：</p>
          <ul className="mt-2 text-sm text-white/70">
            {active.context.map((x) => (
              <li key={x}>· {x}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-white/45">
            有效至 {active.expiresOn}。链接不授予查看完整报告的权限。
          </p>
          <Button className="mt-5" onClick={copyInvite}>
            <Link2 />
            {copied ? "已复制" : "复制受控邀请链接"}
          </Button>
        </section>
        <section className="rounded-3xl border border-white/10 p-6">
          <p className="text-xs text-blue-200 uppercase">对方只补充一条</p>
          <div className="mt-4 flex gap-2">
            {(["fact", "view", "support"] as const).map((x) => (
              <button
                className={`rounded-full border px-3 py-1 text-xs ${kind === x ? "border-zhihu text-blue-200" : "border-white/15"}`}
                key={x}
                onClick={() => setKind(x)}
                type="button"
              >
                {x === "fact"
                  ? "事实补充"
                  : x === "view"
                    ? "个人观点"
                    : "情绪支持"}
              </button>
            ))}
          </div>
          <textarea
            className="mt-4 min-h-32 w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm"
            onChange={(e) => setText(e.target.value)}
            placeholder="只写你愿意提供的一条信息"
            value={text}
          />
          <Button className="mt-4" disabled={!text.trim()} onClick={copyReply}>
            <Clipboard />
            复制这条补充
          </Button>
          <p className="mt-4 flex gap-2 text-xs text-white/60">
            <ShieldCheck className="text-signal-lime size-4" />
            不同类型会并列保留，不会投票合成“正确答案”。
          </p>
        </section>
      </div>
    </PageFrame>
  );
}
