import type { ReactNode } from "react";

import { ExperienceProgress } from "@/components/experience/progress";
import { cn } from "@/lib/utils";

export function PageFrame({
  eyebrow,
  title,
  description,
  step,
  actions,
  children,
  className
}: {
  eyebrow: string;
  title: string;
  description: string;
  step?: 1 | 2 | 3 | 4;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-[90rem] px-4 py-8 sm:px-6 sm:py-12 lg:px-8",
        className
      )}
    >
      {step ? <ExperienceProgress current={step} /> : null}
      <header className="stage-reveal mt-8 flex flex-col gap-5 border-b border-white/[0.07] pb-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-blue-300 uppercase">
            {eyebrow}
          </p>
          <h1 className="font-display text-3xl leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
            {description}
          </p>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>
        ) : null}
      </header>
      <div className="stage-reveal stage-delay-1 py-8 sm:py-10">{children}</div>
    </main>
  );
}
