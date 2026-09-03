import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shadow-blue relative block size-9 overflow-hidden rounded-xl border border-white/12 bg-white/[0.04]",
        className
      )}
    >
      <span className="bg-world-stay absolute bottom-1.5 left-2 h-5 w-0.5 origin-bottom -rotate-[22deg] rounded-full" />
      <span className="bg-world-leap absolute bottom-1.5 left-1/2 h-6 w-0.5 -translate-x-1/2 rounded-full" />
      <span className="bg-world-bridge absolute right-2 bottom-1.5 h-5 w-0.5 origin-bottom rotate-[22deg] rounded-full" />
      <span className="absolute top-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-white" />
    </span>
  );
}
