import { z } from "zod";

export const TopicDraftSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(80),
    normalizedQuestion: z.string().min(1).max(120),
    tension: z.string().min(1).max(160),
    worlds: z
      .array(
        z
          .object({
            id: z.string().min(1),
            name: z.string().min(1),
            tagline: z.string().min(1),
            focus: z.string().min(1)
          })
          .strict()
      )
      .length(3),
    assumptions: z
      .array(
        z
          .object({
            label: z.string().min(1),
            checkQuestion: z.string().min(1)
          })
          .strict()
      )
      .length(3),
    experiment: z
      .object({
        title: z.string().min(1),
        question: z.string().min(1),
        steps: z.array(z.string().min(1)).length(3),
        exitRule: z.string().min(1)
      })
      .strict(),
    safety: z
      .object({
        status: z.enum(["draft", "needs-review"]),
        message: z.string().min(1)
      })
      .strict()
  })
  .strict();

export type TopicDraft = z.infer<typeof TopicDraftSchema>;

export const TOPIC_PRESETS = [
  {
    id: "startup-leader-invitation",
    label: "跟领导创业",
    input: "稳定高薪工作与跟领导创业如何选择？"
  },
  {
    id: "graduate-school-or-work",
    label: "读研还是工作",
    input: "现在应该继续工作，还是辞职准备读研？"
  }
] as const;

function slug(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `topic-${(hash >>> 0).toString(36)}`;
}

function studyTemplate(question: string): TopicDraft {
  return {
    id: "graduate-school-or-work",
    title: "继续工作，还是辞职读研？",
    normalizedQuestion: question,
    tension: "眼前收入、未来门槛和几年时间成本，不能只靠一句“以后会更好”来决定。",
    worlds: [
      { id: "stay", name: "继续工作", tagline: "保住现金流，边做边看", focus: "验证工作经验能否换来下一步机会" },
      { id: "leap", name: "全力读研", tagline: "集中投入，换一张新入场券", focus: "验证目标学校和专业是否真的值得投入" },
      { id: "bridge", name: "边工作边准备", tagline: "先保留退路，再买学习信息", focus: "验证时间和精力能不能撑住双线计划" }
    ],
    assumptions: [
      { label: "读研后真的更容易进入目标行业", checkQuestion: "找三位目标行业从业者核对学历是否是硬门槛。" },
      { label: "家里和现金流能扛住几年投入", checkQuestion: "按最低开支重算学费、生活费和收入中断。" },
      { label: "边工作边准备不会把两件事都做砸", checkQuestion: "用两周实测学习时长和工作余量，不看理想计划。" }
    ],
    experiment: {
      title: "七天读研价值核验",
      question: "目标学校、专业和时间成本，真的能换来你要的机会吗？",
      steps: ["列三所目标项目的硬性门槛和毕业去向", "访谈三位在读生或从业者", "按真实时间和现金重跑一次家庭预算"],
      exitRule: "七天后仍说不清目标岗位和成本，就不提交不可逆的辞职或报名决定。"
    },
    safety: {
      status: "needs-review",
      message: "这是结构化候选剧本，正式推演前还需要检索并人工审核对应的知乎经验。"
    }
  };
}

export function generateTopicDraft(input: string): TopicDraft {
  const question = input.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!question) throw new Error("请先输入一个想认真想清楚的问题");
  if (/读研|研究生|考研|升学/.test(question)) {
    return TopicDraftSchema.parse(studyTemplate(question));
  }

  const title = question.endsWith("？") ? question : `${question}？`;
  const draft: TopicDraft = {
    id: slug(question),
    title,
    normalizedQuestion: question,
    tension: "先把冲突拆成几条路，再用低成本证据检查最相信的那句话。",
    worlds: [
      { id: "stay", name: "继续原路", tagline: "保留现有安全边界", focus: "看清留下的机会成本" },
      { id: "leap", name: "全押新路", tagline: "把资源集中到一个方向", focus: "看清最坏情况是否可承受" },
      { id: "bridge", name: "搭桥试水", tagline: "先做小实验，再决定是否加码", focus: "用可逆行动换真实反馈" }
    ],
    assumptions: [
      { label: "这条新路真的会带来想要的结果", checkQuestion: "找一个能直接证明结果的外部信号。" },
      { label: "现在的代价在承受范围内", checkQuestion: "把现金、时间和关系成本写成具体数字。" },
      { label: "失败之后仍然有可行退路", checkQuestion: "提前找三条真实退路，不把想象当安全垫。" }
    ],
    experiment: {
      title: "七天最小验证",
      question: `在不做不可逆决定前，能否先验证“${question}”里最关键的一件事？`,
      steps: ["写下一个可观察的结果标准", "找三位相关当事人或一手资料核对", "设定投入上限、截止日和退出条件"],
      exitRule: "七天后没有新增事实，就不自动加码，只重新定义问题或暂停。"
    },
    safety: {
      status: "needs-review",
      message: "这是通用结构草稿，不是对该议题的事实判断；接入正式推演前需要知乎检索、来源审核和人工确认。"
    }
  };
  return TopicDraftSchema.parse(draft);
}
