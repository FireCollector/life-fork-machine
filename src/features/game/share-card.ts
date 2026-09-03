export interface ShareCardMetric {
  label: string;
  value: string;
}

export interface ShareCardData {
  worldName: string;
  worldTagline: string;
  actionLabels: string[];
  assumptionLabel: string;
  experimentTitle: string;
  experimentQuestion: string;
  experimentStatus: string;
  nextStep: string;
  evidenceScore: number;
  metrics: ShareCardMetric[];
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function text(value: string) {
  return escapeXml(value).slice(0, 80);
}

export function buildShareCardSvg(data: ShareCardData) {
  const metrics = data.metrics.slice(0, 4);
  const actions = data.actionLabels.slice(0, 3);
  const actionMarkup = actions
    .map(
      (action, index) =>
        `<text x="54" y="${232 + index * 27}" fill="#dbe5ff" font-size="14">0${index + 1}  ${text(action)}</text>`
    )
    .join("");
  const metricMarkup = metrics
    .map(
      (metric, index) => `
        <g transform="translate(${72 + (index % 2) * 286} ${520 + Math.floor(index / 2) * 78})">
          <rect width="258" height="58" rx="14" fill="#121b31" stroke="#2b3a5a" />
          <text x="18" y="22" fill="#8e9ab4" font-size="12">${text(metric.label)}</text>
          <text x="18" y="44" fill="#f5f7ff" font-size="16" font-weight="600">${text(metric.value)}</text>
        </g>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="730" viewBox="0 0 680 730">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#081022" />
      <stop offset="1" stop-color="#17112b" />
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4aa9ff" />
      <stop offset="1" stop-color="#c68cff" />
    </linearGradient>
  </defs>
  <rect width="680" height="590" rx="28" fill="url(#bg)" />
  <circle cx="610" cy="58" r="120" fill="#4a79ff" opacity="0.12" />
  <circle cx="90" cy="680" r="140" fill="#bb75ff" opacity="0.08" />
  <text x="54" y="58" fill="#7fb8ff" font-size="13" font-weight="600" letter-spacing="3">LIFE FORK MACHINE</text>
  <text x="54" y="112" fill="#ffffff" font-size="34" font-weight="700">我选择了「${text(data.worldName)}」</text>
  <text x="54" y="146" fill="#aeb9cf" font-size="16">${text(data.worldTagline)}</text>
  <rect x="54" y="184" width="572" height="2" fill="url(#accent)" opacity="0.8" />
  <text x="54" y="205" fill="#8e9ab4" font-size="11" letter-spacing="2">这次实际走过的三步</text>
  ${actionMarkup}
  <rect x="54" y="310" width="572" height="2" fill="#2b3a5a" />
  <text x="54" y="350" fill="#8e9ab4" font-size="12" letter-spacing="2">先查一个最相信的判断</text>
  <text x="54" y="382" fill="#ffffff" font-size="21" font-weight="600">${text(data.assumptionLabel)}</text>
  <text x="54" y="424" fill="#8e9ab4" font-size="12" letter-spacing="2">七天现实实验</text>
  <text x="54" y="456" fill="#ffffff" font-size="19" font-weight="600">${text(data.experimentTitle)}</text>
  <text x="54" y="483" fill="#aeb9cf" font-size="13">${text(data.experimentQuestion)}</text>
  <rect x="480" y="424" width="146" height="42" rx="21" fill="#173b35" stroke="#4ed49a" />
  <text x="553" y="450" fill="#8bf0bb" text-anchor="middle" font-size="13">${text(data.experimentStatus)}</text>
  <text x="54" y="515" fill="#8e9ab4" font-size="12" letter-spacing="2">下一步</text>
  <text x="54" y="540" fill="#dbe5ff" font-size="13">${text(data.nextStep)}</text>
  ${metricMarkup}
  <text x="54" y="690" fill="#71809f" font-size="11">这是基于情景和演示规则的反思材料，不是预测或职业建议。</text>
</svg>`;
}

export async function downloadShareCard(data: ShareCardData) {
  const svgBlob = new Blob([buildShareCardSvg(data)], {
    type: "image/svg+xml;charset=utf-8"
  });
  const svgUrl = URL.createObjectURL(svgBlob);
  const image = new Image();
  image.decoding = "async";
  image.src = svgUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = 1360;
  canvas.height = 1460;
  const context = canvas.getContext("2d");
  if (!context) {
    URL.revokeObjectURL(svgUrl);
    throw new Error("当前浏览器不支持生成结果卡");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(svgUrl);

  const pngBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!pngBlob) throw new Error("结果卡生成失败，请重试");

  const downloadUrl = URL.createObjectURL(pngBlob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = "人生分岔机-结果卡.png";
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
}

export function buildShareSummary(data: ShareCardData) {
  const actions = data.actionLabels.length
    ? data.actionLabels.map((action, index) => `${index + 1}. ${action}`).join("\n")
    : "暂无记录";
  return [
    `我在《人生分岔机》里选择了「${data.worldName}」`,
    `三幕选择：\n${actions}`,
    `关键假设：${data.assumptionLabel}`,
    `七天实验：${data.experimentTitle}（${data.experimentStatus}）`,
    `验证问题：${data.experimentQuestion}`,
    `证据进度：${data.evidenceScore} / 100`,
    `下一步：${data.nextStep}`,
    "这不是预测，而是把想法拿去现实核验。"
  ].join("\n");
}
