import type {
  CommitmentLedger,
  GameSession,
  OutcomeTemplates,
  Scenario,
  StateVector,
  World
} from "./schema";

const stateLabels: Record<keyof StateVector, string> = {
  cashSafety: "手头资金",
  careerOptionality: "找工作余地",
  growthSlope: "成长速度",
  relationshipCapital: "关系状况",
  wellbeingLoad: "身心压力",
  valueAlignment: "符合内心"
};

export type ExperimentFeedback = "supported" | "contradicted" | "inconclusive";

const feedbackLabels: Record<ExperimentFeedback, string> = {
  supported: "证据支持",
  contradicted: "证据冲突",
  inconclusive: "暂时不清楚"
};

function list(title: string, items: string[]) {
  return `${title}\n${items.map((item) => `- ${item}`).join("\n")}`;
}

export function buildOutcomeText({
  assumption,
  blindSpots,
  experiment,
  futureLetter,
  ledger,
  state,
  world,
  experimentFeedback,
  experimentRun,
  dimensions
}: {
  assumption?: OutcomeTemplates["assumptionBlasts"][number];
  blindSpots: OutcomeTemplates["blindSpots"];
  experiment: OutcomeTemplates["sevenDayExperiments"][number];
  futureLetter: OutcomeTemplates["futureLetters"][number];
  ledger: CommitmentLedger;
  state: StateVector;
  world: World;
  experimentFeedback?: ExperimentFeedback;
  experimentRun?: GameSession["experimentRun"];
  dimensions?: Scenario["stateModel"]["dimensions"];
}) {
  const stateLine = Object.entries(state)
    .map(
      ([key, value]) =>
        `${dimensions?.[key]?.label ?? stateLabels[key as keyof StateVector] ?? key} ${Math.round(value)}`
    )
    .join("｜");
  const unknowns = ledger.facts
    .slice(-3)
    .map((fact) => `${fact}，能否在下一周期继续成立？`);

  return [
    `《人生分岔机》代价地图｜${world.name}`,
    "说明：这是基于冻结情景和本地规则的反思材料，不是成功率预测或职业建议。",
    `当前状态：${stateLine}`,
    list("得到", ledger.benefits.slice(0, 4)),
    list("失去", ledger.costs.slice(0, 4)),
    list("仍不知道", unknowns),
    `发现想错了：${assumption?.label ?? "未记录"}`,
    list(
      "关键盲点",
      blindSpots.map((blindSpot) => `${blindSpot.title}：${blindSpot.text}`)
    ),
    `一年后来信（情景文本）：${futureLetter.template}`,
    `7 天现实实验：${experiment.title}`,
    `要验证什么：${experiment.question}`,
    `为什么现在查：${experiment.whyNow}`,
    list("步骤", experiment.steps),
    `什么算证据：${experiment.evidence}`,
    list("证据支持", [experiment.resultMeaning.supported]),
    list("证据冲突", [experiment.resultMeaning.contradicted]),
    list("暂时不清楚", [experiment.resultMeaning.inconclusive]),
    `时间上限：${experiment.timeBudget}；花费上限：${experiment.moneyBudget}`,
    `退出规则：${experiment.exitRule}`,
    ...(experimentRun
      ? [
          `实验进度：第 ${experimentRun.day} / 7 天${experimentRun.status === "completed" ? "（已完成）" : "（进行中）"}`,
          `证据进度：${experimentRun.evidenceScore ?? 0} / 100，已记录 ${(experimentRun.events ?? []).length} 条当天记录`
        ]
      : []),
    ...(experimentFeedback
      ? [
          `演示反馈：${feedbackLabels[experimentFeedback]}`,
          `反馈含义：${experiment.resultMeaning[experimentFeedback]}`,
          `下一步建议：${experiment.nextStep[experimentFeedback]}`,
          "说明：这是演示反馈，不是真实执行结果，也不会在后台持续跟踪。"
        ]
      : [])
  ].join("\n\n");
}
