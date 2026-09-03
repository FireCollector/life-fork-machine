import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const steps = [
  { index: 1, label: "约束校准" },
  { index: 2, label: "证据熔炉" },
  { index: 3, label: "三幕推演" },
  { index: 4, label: "代价报告" }
] as const;

export function ExperienceProgress({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div
      aria-label={`体验进度：第 ${current} 步，共 4 步`}
      className="grid grid-cols-4 gap-1 sm:gap-2"
    >
      {steps.map((step) => {
        const complete = step.index < current;
        const active = step.index === current;

        return (
          <div className="min-w-0" key={step.index}>
            <div
              className={cn(
                "rail-progress mb-2 h-1 rounded-full",
                step.index <= current ? "bg-zhihu" : "bg-white/10"
              )}
            />
            <div
              className={cn(
                "flex items-center gap-1.5 text-[10px] sm:text-xs",
                active ? "text-white" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border text-[9px] sm:size-5",
                  step.index <= current
                    ? "border-zhihu/60 bg-zhihu/15 text-blue-200"
                    : "border-white/10"
                )}
              >
                {complete ? (
                  <Check aria-hidden="true" className="size-2.5" />
                ) : (
                  step.index
                )}
              </span>
              <span className="truncate">{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
