import { ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[90rem] px-4 pb-8 sm:px-6 lg:px-8">
      <div className="text-muted-foreground flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-xs leading-5 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-3xl">
          本体验用于展开选择中的收益、代价与未知，不提供成功概率、最佳答案或职业预测。知乎内容仅作为社区经验样本。
        </p>
        <span className="flex shrink-0 items-center gap-1.5 text-white/55">
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          匿名本地体验 · 无 OAuth
        </span>
      </div>
    </footer>
  );
}
