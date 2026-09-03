import type { ExperimentDay, OutcomeTemplates } from "./schema";

type Experiment = OutcomeTemplates["sevenDayExperiments"][number];

const DEFAULT_CHOICES = [
  ["按计划做完", "先补一条信息再做"],
  ["把数字算清楚", "先凭感觉往下走"],
  ["找当事人确认", "先自己猜一个答案"],
  ["把意外记下来并重算", "先忽略这次意外"],
  ["把边界写成文字", "先口头约定"],
  ["找第三方挑刺", "只听支持自己的意见"],
  ["按证据做决定", "再拖一周看看"]
] as const;

function enrichDay(day: ExperimentDay, index: number): ExperimentDay {
  return {
    ...day,
    choices: day.choices ?? [...DEFAULT_CHOICES[index]],
    evidencePrompt:
      day.evidencePrompt ?? `今天留下什么，明天还能拿出来复核？`,
    surprise: day.surprise ?? day.day === 4
  };
}

/**
 * Keep the demo playable for older or newly-authored experiment templates.
 * A content author can provide concrete `simulationDays`; otherwise we turn
 * the three required actions into a short, honest seven-day rehearsal.
 */
export function getExperimentDays(experiment: Experiment): ExperimentDay[] {
  if (experiment.simulationDays) {
    return experiment.simulationDays.map((day, index) => enrichDay(day, index));
  }

  const genericDays: ExperimentDay[] = [
    {
      day: 1,
      title: "写下要验证的问题",
      situation: `先把“${experiment.question}”改成一句能查证的话。`,
      action: "写下支持、冲突和暂时不清楚分别要看到什么。",
      evidence: "有一条明确问题和三个结果标准。"
    },
    {
      day: 2,
      title: "做第一步",
      situation: "不要先靠感觉判断，先完成实验的第一步。",
      action: experiment.steps[0],
      evidence: "留下第一步的记录或材料。"
    },
    {
      day: 3,
      title: "把事实补齐",
      situation: "把昨天没问清的地方列出来，找能直接回答它的人。",
      action: "补一次沟通或材料核对。",
      evidence: "至少补上一个原本缺失的事实。"
    },
    {
      day: 4,
      title: "遇到一个意外",
      situation: "现实通常不会按计划走，记录一个让原判断需要调整的新情况。",
      action: "把这条新情况写进实验记录，不替它找借口。",
      evidence: "能说清它改变了哪一个假设。"
    },
    {
      day: 5,
      title: "做第二步",
      situation: "现在继续推进，但不要扩大投入。",
      action: experiment.steps[1],
      evidence: "拿到可复核的反馈，而不是只有‘感觉不错’。"
    },
    {
      day: 6,
      title: "请第三方挑刺",
      situation: "找一个不靠这件事获利的人，听他指出你的盲点。",
      action: experiment.steps[2],
      evidence: "至少记下一条反对意见和你的回应。"
    },
    {
      day: 7,
      title: "对照标准复盘",
      situation: "把七天记录放回最初的问题，不把过程热闹当成答案。",
      action: "按证据支持、证据冲突或暂时不清楚做选择。",
      evidence: experiment.evidence,
      evidencePrompt: "把七天记录放回最初的问题，写下你最后依据的数字。"
    }
  ];

  return genericDays.map((day, index) => enrichDay(day, index));
}
