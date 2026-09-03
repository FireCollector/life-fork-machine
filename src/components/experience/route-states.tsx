import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "glass-panel stage-reveal flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-white/12 px-5 py-10 text-center",
        className
      )}
      role="status"
    >
      <span className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-blue-300">
        <Icon aria-hidden={true} className="size-5" />
      </span>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}

export function PageLoading({
  label = "正在对齐平行世界"
}: {
  label?: string;
}) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex min-h-[64vh] w-full max-w-[90rem] items-center justify-center px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="stage-reveal text-center">
        <div aria-hidden="true" className="relative mx-auto mb-7 size-20">
          <span className="border-zhihu/35 loading-orbit absolute inset-0 rounded-full border border-dashed" />
          <span className="border-world-bridge/35 loading-orbit loading-orbit--reverse absolute inset-3 rounded-full border" />
          <span className="bg-zhihu shadow-blue absolute top-0 left-1/2 size-2.5 -translate-x-1/2 rounded-full" />
          <span className="bg-world-bridge absolute right-2 bottom-3 size-2 rounded-full" />
          <span className="bg-night absolute inset-6 rounded-full border border-white/10" />
        </div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-muted-foreground mt-2 text-xs">
          如果启用了减少动态效果，转场会立即完成。
        </p>
        <div className="mx-auto mt-5 flex w-32 gap-1.5">
          {[0, 1, 2].map((item) => (
            <span
              className={`rail-progress bg-zhihu/50 h-0.5 flex-1 rounded-full stage-delay-${item + 1}`}
              key={item}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
