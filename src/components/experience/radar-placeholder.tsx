export function RadarPlaceholder() {
  const rings = [30, 54, 78];
  const points = ["100,16", "173,58", "173,142", "100,184", "27,142", "27,58"];

  return (
    <svg
      aria-label="三条世界六维雷达图占位"
      className="mx-auto aspect-square w-full max-w-sm"
      role="img"
      viewBox="0 0 200 200"
    >
      {rings.map((radius) => (
        <polygon
          className="fill-none stroke-white/10"
          key={radius}
          points={points
            .map((point) => {
              const [x, y] = point.split(",").map(Number);
              const ratio = radius / 78;
              return `${100 + (x - 100) * ratio},${100 + (y - 100) * ratio}`;
            })
            .join(" ")}
          strokeWidth="1"
        />
      ))}
      {points.map((point) => (
        <line
          className="stroke-white/10"
          key={point}
          strokeWidth="1"
          x1="100"
          x2={point.split(",")[0]}
          y1="100"
          y2={point.split(",")[1]}
        />
      ))}
      <polygon
        className="fill-world-stay/10 stroke-world-stay"
        points="100,34 156,68 146,127 100,164 46,131 52,72"
        strokeWidth="1.5"
      />
      <polygon
        className="fill-world-leap/10 stroke-world-leap"
        points="100,60 139,77 164,137 100,173 63,122 37,64"
        strokeWidth="1.5"
      />
      <polygon
        className="fill-world-bridge/10 stroke-world-bridge"
        points="100,45 158,66 151,130 100,168 39,135 46,69"
        strokeWidth="1.5"
      />
      <circle className="fill-white" cx="100" cy="100" r="2" />
    </svg>
  );
}
