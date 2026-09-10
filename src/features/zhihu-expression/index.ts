import { z } from "zod";

const Text = z.string().trim().min(1).max(280);

export const ZhihuExpressionSeedSchema = z
  .object({
    version: z.literal(1),
    topic: Text,
    route: Text,
    actions: z.array(Text).max(3),
    assumption: Text,
    experiment: z
      .object({
        title: Text,
        question: Text,
        status: Text,
        evidenceProgress: z.number().int().min(0).max(100),
        nextStep: Text,
        feedback: z
          .enum(["supported", "contradicted", "inconclusive"])
          .optional()
      })
      .strict(),
    sources: z
      .array(
        z.object({ title: Text, author: Text, url: z.string().url() }).strict()
      )
      .max(12)
  })
  .strict();

export type ZhihuExpressionSeed = z.infer<typeof ZhihuExpressionSeedSchema>;

export const ZHIHU_EXPRESSION_HANDOFF_KEY =
  "life-fork-machine:zhihu-expression:v1";

export function createZhihuExpressionDraft(input: ZhihuExpressionSeed) {
  const seed = ZhihuExpressionSeedSchema.parse(input);
  const experimentLine =
    seed.experiment.feedback === "supported"
      ? "这次记录更支持原先的判断，但还不足以把它当作普遍结论。"
      : seed.experiment.feedback === "contradicted"
        ? "这次记录和原先的判断有冲突，我会先调整计划，而不是把它解释成失败。"
        : seed.experiment.feedback === "inconclusive"
          ? "这次记录还不足以判断，我会补一条更直接的证据。"
          : "实验仍在进行，我暂时不把过程写成结论。";
  const actionLines = seed.actions.length
    ? seed.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")
    : "这次没有保留可公开的具体行动。";
  const sourceLines = seed.sources.length
    ? seed.sources
        .map(
          (source, index) =>
            `${index + 1}. ${source.title}｜${source.author}\n${source.url}`
        )
        .join("\n")
    : "本次没有可公开列出的知乎引用。";

  return {
    title: `我怎样把“${seed.topic}”从纠结变成一次小验证`,
    body: [
      `最近我在想：${seed.topic}。`,
      "我没有试图找一个替我做决定的答案，而是先选了一条可以回头的路。",
      `我当时走的是「${seed.route}」。过程里，我做了这几件事：\n${actionLines}`,
      `我最需要核对的，不是“哪条路更好”，而是：${seed.assumption}。`,
      `我给自己安排了一个小实验：「${seed.experiment.title}」。\n它要回答：${seed.experiment.question}\n目前状态：${seed.experiment.status}，证据进度 ${seed.experiment.evidenceProgress}/100。`,
      `我验证到的事：${experimentLine}`,
      `我还不知道的事：这次样本是否足够，以及这些经验是否真的适用于我的现实条件。`,
      `下一步：${seed.experiment.nextStep}`,
      "下面是我阅读时保留、但没有当成标准答案的来源：\n" + sourceLines,
      "这是一段个人复盘草稿，不是对任何人的建议，也不代表结果已经确定。"
    ].join("\n\n")
  };
}

export type PrivacyFinding = {
  kind: "phone" | "email" | "id" | "amount";
  label: string;
};

/** Finds common high-risk strings without echoing the matched private text. */
export function auditZhihuExpression(text: string): PrivacyFinding[] {
  const checks: Array<[PrivacyFinding, RegExp]> = [
    [{ kind: "phone", label: "疑似手机号" }, /(?<!\d)1[3-9]\d{9}(?!\d)/],
    [{ kind: "email", label: "疑似邮箱地址" }, /[\w.+-]+@[\w-]+\.[\w.-]+/],
    [{ kind: "id", label: "疑似身份证号" }, /(?<!\d)\d{17}[\dXx](?!\d)/],
    [
      { kind: "amount", label: "疑似精确金额或收入" },
      /(?:¥|￥|人民币)?\s*\d{3,}(?:[,.]\d{1,2})?\s*(?:元|块|万元|w)/i
    ]
  ];
  return checks
    .filter(([, pattern]) => pattern.test(text))
    .map(([finding]) => finding);
}

export const privacyChecklist = [
  "我确认草稿不含真实姓名、账号、联系方式或可定位身份的信息。",
  "我确认草稿不含精确收入、家庭成员细节、公司内部信息或未公开材料。",
  "我已打开并核对引用链接；它们是阅读线索，不代表事实结论。",
  "我知道这只是草稿：复制后仍由我自行修改和发布，产品不会代发。"
] as const;
