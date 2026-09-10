"use client";

import Link from "next/link";
import { Check, Clipboard, ExternalLink, Eye, ShieldAlert } from "lucide-react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { PageFrame } from "@/components/experience/page-frame";
import { Button } from "@/components/ui/button";
import {
  auditZhihuExpression,
  createZhihuExpressionDraft,
  privacyChecklist,
  ZHIHU_EXPRESSION_HANDOFF_KEY,
  ZhihuExpressionSeedSchema
} from "@/features/zhihu-expression";

export function ZhihuExpressionStudio() {
  const subscribe = useCallback(() => () => undefined, []);
  const getSnapshot = useCallback(
    () => window.localStorage.getItem(ZHIHU_EXPRESSION_HANDOFF_KEY),
    []
  );
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const seed = useMemo(() => {
    if (!raw) return undefined;
    try {
      const parsed = ZhihuExpressionSeedSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : undefined;
    } catch {
      return undefined;
    }
  }, [raw]);
  const generated = useMemo(
    () => (seed ? createZhihuExpressionDraft(seed) : undefined),
    [seed]
  );
  const [editedTitle, setEditedTitle] = useState<string>();
  const [editedBody, setEditedBody] = useState<string>();
  const [confirmed, setConfirmed] = useState<boolean[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );

  const title = editedTitle ?? generated?.title ?? "";
  const body = editedBody ?? generated?.body ?? "";
  const findings = auditZhihuExpression(`${title}\n${body}`);
  const canCopy =
    Boolean(seed) &&
    findings.length === 0 &&
    confirmed.length === privacyChecklist.length &&
    confirmed.every(Boolean);

  async function copyDraft() {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(`${title}\n\n${body}`);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  if (!seed || !generated) {
    return (
      <PageFrame
        eyebrow="ZHIHU EXPRESSION / TASK-042"
        title="先从一份完成的推演结果开始。"
        description="知乎回答草稿只从你明确带入的公开结果生成；不会读取账号或代你发布。"
      >
        <section className="glass-panel mx-auto max-w-2xl rounded-3xl border border-white/10 p-6 sm:p-8">
          <p className="text-muted-foreground text-sm leading-6">
            当前没有可用的本地结果。完成三幕推演或七天实验后，从结果页点击“整理为知乎回答草稿”即可带入。
          </p>
          <Button asChild className="mt-5">
            <Link href="/demo">打开演示结果</Link>
          </Button>
        </section>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      eyebrow="ZHIHU EXPRESSION / TASK-042"
      title="把一次验证，整理成你自己的知乎表达。"
      description="这里只生成可编辑草稿。你决定删改什么、是否发布；系统不会调用发布接口，也不会访问账号数据。"
    >
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-panel rounded-3xl border border-white/10 p-5 sm:p-7">
          <p className="text-xs tracking-[0.16em] text-blue-200 uppercase">
            Editable draft
          </p>
          <label className="text-muted-foreground mt-4 block text-xs">
            标题
            <input
              className="focus:border-zhihu/50 mt-2 h-11 w-full rounded-xl border border-white/[0.1] bg-black/20 px-3 text-sm text-white outline-none"
              maxLength={120}
              onChange={(event) => setEditedTitle(event.target.value)}
              value={title}
            />
          </label>
          <label className="text-muted-foreground mt-4 block text-xs">
            回答草稿
            <textarea
              className="focus:border-zhihu/50 mt-2 min-h-[32rem] w-full rounded-2xl border border-white/[0.1] bg-black/20 p-4 text-sm leading-7 text-white outline-none"
              maxLength={6000}
              onChange={(event) => setEditedBody(event.target.value)}
              value={body}
            />
          </label>
          <Button disabled={!canCopy} className="mt-5" onClick={copyDraft}>
            {copyState === "copied" ? (
              <Check aria-hidden="true" />
            ) : (
              <Clipboard aria-hidden="true" />
            )}
            {copyState === "copied" ? "已复制草稿" : "复制知乎回答草稿"}
          </Button>
          {copyState === "error" ? (
            <p className="text-world-leap mt-3 text-xs">
              浏览器不允许复制，请手动选择文本。
            </p>
          ) : null}
        </section>
        <aside className="space-y-5 xl:sticky xl:top-24 xl:h-fit">
          <section className="border-signal-lime/20 bg-signal-lime/[0.04] rounded-3xl border p-5">
            <p className="text-signal-lime flex items-center gap-2 text-sm font-medium">
              <Eye aria-hidden="true" className="size-4" />
              这次会公开什么
            </p>
            <p className="text-muted-foreground mt-3 text-xs leading-5">
              路线、已选行动、待验证假设、实验进展和你主动保留的来源。不会带入
              session ID、个人备注、账号信息或本地档案。
            </p>
          </section>
          <section className="border-world-leap/25 bg-world-leap/[0.04] rounded-3xl border p-5">
            <p className="text-world-leap flex items-center gap-2 text-sm font-medium">
              <ShieldAlert aria-hidden="true" className="size-4" />
              隐私检查
            </p>
            {findings.length ? (
              <p className="mt-3 text-xs leading-5 text-white/75">
                发现：{findings.map((finding) => finding.label).join("、")}
                。请删改后再复制；系统不会显示原始敏感片段。
              </p>
            ) : (
              <p className="mt-3 text-xs text-white/70">
                未发现常见联系方式、身份证号或精确金额模式。仍请自行检查名称、家庭和公司内部信息。
              </p>
            )}
            <div className="mt-4 space-y-3">
              {privacyChecklist.map((item, index) => (
                <label
                  className="flex cursor-pointer gap-2 text-xs leading-5 text-white/75"
                  key={item}
                >
                  <input
                    checked={Boolean(confirmed[index])}
                    onChange={(event) =>
                      setConfirmed((current) => {
                        const next = [...current];
                        next[index] = event.target.checked;
                        return next;
                      })
                    }
                    type="checkbox"
                  />
                  {item}
                </label>
              ))}
            </div>
          </section>
          <section className="rounded-3xl border border-white/[0.1] p-5">
            <p className="text-sm font-medium">可检查的知乎来源</p>
            <ul className="mt-3 space-y-3 text-xs">
              {seed.sources.length ? (
                seed.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      className="inline-flex items-center gap-1 text-blue-200"
                      href={source.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {source.title}{" "}
                      <ExternalLink aria-hidden="true" className="size-3" />
                    </a>
                    <p className="mt-1 text-white/55">{source.author}</p>
                  </li>
                ))
              ) : (
                <li className="text-white/55">没有可公开列出的来源。</li>
              )}
            </ul>
          </section>
          <section className="rounded-3xl border border-white/[0.1] p-5 text-xs leading-5 text-white/70">
            <p className="font-medium text-white">可选的知乎授权</p>
            <p className="mt-2">
              当前项目未启用
              OAuth。本页不会登录、同步或发布。未来只有在部署到公网
              HTTPS、配置应用凭证且你主动点击授权后，才可进入授权流程；授权失败、取消或过期都会停止访问。
            </p>
          </section>
        </aside>
      </div>
    </PageFrame>
  );
}
