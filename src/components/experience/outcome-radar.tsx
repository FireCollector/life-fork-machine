import type { OutcomeComparison, Scenario, StateVector } from "@/features/game";

const SIZE = 520;
const CENTER_X = 260;
const CENTER_Y = 205;
const RADIUS = 142;

const axes: Array<{
  key: keyof StateVector;
  value: (state: StateVector) => number;
}> = [
  { key: "cashSafety", value: (state) => state.cashSafety },
  {
    key: "careerOptionality",
    value: (state) => state.careerOptionality
  },
  { key: "growthSlope", value: (state) => state.growthSlope },
  {
    key: "relationshipCapital",
    value: (state) => state.relationshipCapital
  },
  {
    key: "wellbeingLoad",
    value: (state) => 100 - state.wellbeingLoad
  },
  { key: "valueAlignment", value: (state) => state.valueAlignment }
];

const worldPalette = [
  { color: "#38bdf8", fill: "#38bdf8" },
  { color: "#fb7185", fill: "#fb7185" },
  { color: "#c084fc", fill: "#c084fc" }
] as const;

function dimensionCountLabel(count: number) {
  return count === 6 ? "六维" : `${count}维`;
}

function point(index: number, value: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
  const distance = (RADIUS * value) / 100;
  return {
    x: CENTER_X + Math.cos(angle) * distance,
    y: CENTER_Y + Math.sin(angle) * distance
  };
}

function polygon(values: number[]) {
  return values
    .map((value, index) => {
      const coordinate = point(index, value);
      return `${coordinate.x},${coordinate.y}`;
    })
    .join(" ");
}

export function OutcomeRadar({
  comparison,
  scenario
}: {
  comparison: OutcomeComparison;
  scenario: Scenario;
}) {
  const worldNames = scenario.worlds.map((world) => world.name).join("、");
  const spokenWorldNames = scenario.worlds.length > 1
    ? `${scenario.worlds.slice(0, -1).map((world) => world.name).join("、")}和${scenario.worlds.at(-1)?.name ?? ""}`
    : worldNames;
  const dimensionLabels = scenario.stateModel.dimensions;
  const axisLabel = (key: keyof StateVector) =>
    dimensionLabels[key]?.label ?? key;
  return (
    <figure aria-labelledby="outcome-radar-title" className="min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
            Three-world cost map
          </p>
          <h2 className="mt-2 text-xl font-semibold" id="outcome-radar-title">
            同一组约束，{scenario.worlds.length}种代价形状
          </h2>
        </div>
        <p className="text-muted-foreground max-w-sm text-[10px] leading-4">
          {dimensionLabels.wellbeingLoad
            ? `“${dimensionLabels.wellbeingLoad.label}”在图中换成了“身心余量”。越靠外，说明余量越多；这不是成功率。`
            : "越靠外，说明余量越多；这不是成功率。"}
        </p>
      </div>

      <svg
        aria-label={`${spokenWorldNames}的${dimensionCountLabel(axes.length)}代价雷达对比；${worldNames}的${dimensionCountLabel(axes.length)}代价雷达对比`}
        className="mt-4 h-auto w-full"
        role="img"
        viewBox={`0 0 ${SIZE} 410`}
      >
        <title>{worldNames}的代价雷达图</title>
        <desc>
          当前已走世界使用真实行动账本，其余世界使用冻结场景的情景剖面。图形越外代表该维度余量越高。
        </desc>
        {[25, 50, 75, 100].map((level, index) => (
          <polygon
            className="radar-grid-reveal"
            fill={level === 100 ? "rgba(255,255,255,0.018)" : "none"}
            key={level}
            points={polygon(axes.map(() => level))}
            stroke="rgba(255,255,255,0.11)"
            strokeWidth="1"
            style={{ animationDelay: `${index * 60}ms` }}
          />
        ))}
        {axes.map((axis, index) => {
          const edge = point(index, 100);
          const label = point(index, 118);
          return (
            <g key={axis.key}>
              <line
                stroke="rgba(255,255,255,0.12)"
                x1={CENTER_X}
                x2={edge.x}
                y1={CENTER_Y}
                y2={edge.y}
              />
              <text
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.58)"
                fontSize="12"
                textAnchor={
                  Math.abs(label.x - CENTER_X) < 8
                    ? "middle"
                    : label.x > CENTER_X
                      ? "start"
                      : "end"
                }
                x={label.x}
                y={label.y}
              >
                {axisLabel(axis.key)}
              </text>
            </g>
          );
        })}
        {comparison.worlds.map((outcome, worldIndex) => {
          const meta = worldPalette[worldIndex % worldPalette.length];
          const values = axes.map((axis) => axis.value(outcome.state));
          return (
            <g key={outcome.worldId}>
              <polygon
                className="radar-world-reveal"
                fill={meta.fill}
                fillOpacity={outcome.mode === "explored" ? 0.18 : 0.06}
                points={polygon(values)}
                stroke={meta.color}
                strokeDasharray={
                  outcome.mode === "explored" ? undefined : "7 6"
                }
                strokeOpacity={outcome.mode === "explored" ? 1 : 0.72}
                strokeWidth={outcome.mode === "explored" ? 3 : 2}
                style={{ animationDelay: `${260 + worldIndex * 150}ms` }}
              />
              {outcome.mode === "explored"
                ? values.map((value, index) => {
                    const coordinate = point(index, value);
                    return (
                      <circle
                        className="radar-point-reveal"
                        cx={coordinate.x}
                        cy={coordinate.y}
                        fill={meta.color}
                        key={axes[index].key}
                        r="3.5"
                        style={{
                          animationDelay: `${620 + index * 45}ms`
                        }}
                      />
                    );
                  })
                : null}
            </g>
          );
        })}
      </svg>

      <div className="grid gap-3 sm:grid-cols-3">
        {comparison.worlds.map((outcome) => {
          const meta =
            worldPalette[
              comparison.worlds.findIndex(
                (candidate) => candidate.worldId === outcome.worldId
              ) % worldPalette.length
            ];
          const worldName =
            scenario.worlds.find((world) => world.id === outcome.worldId)
              ?.name ?? outcome.worldId;
          return (
            <div
              className="rounded-2xl border border-white/[0.07] bg-black/10 p-3"
              key={outcome.worldId}
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <p className="text-xs font-medium">{worldName}</p>
              </div>
              <p className="text-muted-foreground mt-1.5 text-[10px] leading-4">
                {outcome.mode === "explored"
                  ? "已走路径 · 真实行动账本"
                  : "未走路径 · 冻结情景剖面"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 max-w-full overflow-x-auto rounded-2xl border border-white/[0.07]">
        <table className="w-full min-w-[34rem] text-left text-[10px]">
          <caption className="sr-only">
            {worldNames}的{dimensionCountLabel(axes.length)}雷达图数据
          </caption>
          <thead className="bg-white/[0.035] text-white/55">
            <tr>
              <th className="px-3 py-2 font-medium">世界</th>
              {axes.map((axis) => (
                <th className="px-2 py-2 font-medium" key={axis.key}>
                  {axisLabel(axis.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.worlds.map((outcome) => (
              <tr
                className="border-t border-white/[0.06]"
                key={outcome.worldId}
              >
                <th className="px-3 py-2 font-medium text-white/75">
                  {scenario.worlds.find((world) => world.id === outcome.worldId)
                    ?.name ?? outcome.worldId}
                </th>
                {axes.map((axis) => (
                  <td
                    className="px-2 py-2 text-white/60 tabular-nums"
                    key={axis.key}
                  >
                    {Math.round(axis.value(outcome.state))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
