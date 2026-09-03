import { cn } from "@/lib/utils";

import type { WorldId } from "@/features/game";

const fallbackWorlds = ["stay", "leap", "bridge"].map((id) => ({
  id,
  name: id
}));
const worldTones = [
  { line: "bg-world-stay", dot: "border-world-stay bg-world-stay" },
  { line: "bg-world-leap", dot: "border-world-leap bg-world-leap" },
  { line: "bg-world-bridge", dot: "border-world-bridge bg-world-bridge" }
] as const;

export function UniverseRail({
  activeWorld = "bridge",
  act = 1,
  worlds = fallbackWorlds
}: {
  activeWorld?: WorldId;
  act?: 1 | 2 | 3;
  worlds?: Array<{ id: WorldId; name: string }>;
}) {
  return (
    <section
      aria-label="三条世界时间线"
      className="rounded-3xl border border-white/[0.08] bg-black/15 p-4 sm:p-5"
    >
      <div className="mb-5 flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
          三条路
        </p>
        <span className="text-muted-foreground text-[11px]">
          第 {act} 幕 / 3
        </span>
      </div>
      <div className="space-y-6">
        {worlds.map((world, worldIndex) => {
          const tone = worldTones[worldIndex % worldTones.length];
          return (
            <div
              className={cn(
                "stage-reveal transition-opacity",
                worldIndex === 1 && "stage-delay-1",
                worldIndex === 2 && "stage-delay-2",
                activeWorld === world.id ? "opacity-100" : "opacity-45"
              )}
              key={world.id}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="truncate text-xs font-medium text-white">
                  {world.name}
                </p>
                {activeWorld === world.id ? (
                  <span className="text-[10px] text-blue-200">当前世界</span>
                ) : null}
              </div>
              <div className="relative flex items-center justify-between">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-white/10"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "rail-progress absolute top-1/2 left-2 h-px -translate-y-1/2 opacity-70",
                    tone.line
                  )}
                  style={{
                    width:
                      act === 1
                        ? "0"
                        : act === 2
                          ? "calc(50% - 0.5rem)"
                          : "calc(100% - 1rem)"
                  }}
                />
                {[1, 2, 3].map((node) => (
                  <span
                    aria-label={`第 ${node} 幕${
                      node === act && activeWorld === world.id ? "，当前" : ""
                    }`}
                    className={cn(
                      "bg-night relative flex size-5 items-center justify-center rounded-full border-2 text-[8px]",
                      node <= act
                        ? tone.dot
                        : "text-muted-foreground border-white/15",
                      node === act && activeWorld === world.id
                        ? "rail-node-current ring-4 ring-white/10"
                        : ""
                    )}
                    key={node}
                  >
                    {node}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
