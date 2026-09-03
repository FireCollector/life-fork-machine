"use client";

import { useState } from "react";
import { Check, Clipboard, Download, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildShareSummary,
  downloadShareCard,
  type ShareCardData
} from "@/features/game";

export function ShareResultCard({ data }: { data: ShareCardData }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [downloadState, setDownloadState] = useState<"idle" | "done" | "error">(
    "idle"
  );

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildShareSummary(data));
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  async function downloadCard() {
    try {
      await downloadShareCard(data);
      setDownloadState("done");
    } catch {
      setDownloadState("error");
    }
  }

  return (
    <section
      aria-labelledby="share-card-title"
      className="glass-panel stage-reveal mt-6 rounded-3xl border border-white/10 p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-zhihu flex items-center gap-2 text-xs font-medium tracking-[0.16em] uppercase">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Privacy-safe share card
          </p>
          <h2 className="mt-2 text-xl font-semibold" id="share-card-title">
            把这次推演带走
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-xs leading-5">
            分享卡会保留三幕选择、关键假设、实验问题和下一步，不包含 session ID、知乎链接、用户备注或任何账号信息。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadCard} size="sm" variant="secondary">
            <Download aria-hidden="true" />
            {downloadState === "done" ? "已下载结果卡" : "下载结果卡"}
          </Button>
          <Button onClick={copySummary} size="sm">
            {copyState === "copied" ? (
              <Check aria-hidden="true" />
            ) : (
              <Clipboard aria-hidden="true" />
            )}
            {copyState === "copied" ? "已复制分享摘要" : "复制分享摘要"}
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0a1124] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-blue-200 text-[10px] font-medium tracking-[0.2em] uppercase">
              LIFE FORK MACHINE
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              我选择了「{data.worldName}」
            </h3>
            <p className="text-muted-foreground mt-2 text-xs">
              {data.worldTagline}
            </p>
          </div>
          <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-[10px] text-emerald-200">
            {data.experimentStatus}
          </span>
        </div>
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
            三幕实际选择
          </p>
          <ol className="mt-3 grid gap-2 text-xs leading-5 text-white/80 md:grid-cols-3">
            {data.actionLabels.map((action, index) => (
              <li className="flex gap-2" key={`${index}-${action}`}>
                <span className="text-blue-200 font-mono">0{index + 1}</span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              先查一个最相信的判断
            </p>
            <p className="mt-2 text-sm font-medium">{data.assumptionLabel}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              七天现实实验
            </p>
            <p className="mt-2 text-sm font-medium">{data.experimentTitle}</p>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              验证：{data.experimentQuestion}
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              证据进度 {data.evidenceScore} / 100
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
            下一步
          </p>
          <p className="mt-2 text-xs leading-5 text-white/80">{data.nextStep}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.metrics.slice(0, 4).map((metric) => (
            <div className="rounded-xl border border-white/[0.08] p-3" key={metric.label}>
              <p className="text-muted-foreground text-[10px]">{metric.label}</p>
              <p className="mt-1 text-sm font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-5 border-t border-white/[0.08] pt-4 text-[10px] leading-4">
          这是基于情景和演示规则的反思材料，不是预测或职业建议。
        </p>
      </div>
      {copyState === "error" || downloadState === "error" ? (
        <p className="text-world-leap mt-3 text-xs" role="alert">
          当前浏览器未授权该操作，可以直接截图保存结果卡。
        </p>
      ) : null}
    </section>
  );
}
