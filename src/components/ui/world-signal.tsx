import { cn } from "@/lib/utils";

const colorClasses = {
  stay: "bg-world-stay",
  leap: "bg-world-leap",
  bridge: "bg-world-bridge"
};

export function WorldSignal({
  color,
  label,
  detail
}: {
  color: keyof typeof colorClasses;
  label: string;
  detail: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
      <span
        aria-hidden="true"
        className={cn(
          "row-span-2 size-2 rounded-full shadow-[0_0_16px_currentColor]",
          colorClasses[color]
        )}
      />
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="text-muted-foreground truncate text-xs">{detail}</p>
    </div>
  );
}
