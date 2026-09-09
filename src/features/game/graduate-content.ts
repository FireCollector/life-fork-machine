import type { RawDemoContent } from "./content";

const sourceIds = [
  "zh-grad-01",
  "zh-grad-02",
  "zh-grad-03",
  "zh-grad-04",
  "zh-grad-05",
  "zh-grad-06"
] as const;

const zero = {
  cashSafety: 0,
  careerOptionality: 0,
  growthSlope: 0,
  relationshipCapital: 0,
  wellbeingLoad: 0,
  valueAlignment: 0
};

const cards = [
  {
    id: "zh-grad-01",
    contentId: "1974879845105296284",
    title: "工作 3 年和读研 3 年哪个更值？",
    url: "https://www.zhihu.com/question/405883269/answer/1974879845105296284",
    author: "知乎用户",
    contentType: "Answer",
    stance: "conditional",
    categories: ["opportunity-cost", "career-transition", "program-fit"],
    claim:
      "学历不是自动加分项；它是否值得，取决于目标岗位是不是硬门槛，以及项目能不能带来真实的能力和机会。",
    conditions: [
      "目标岗位确实看重相关学历或研究训练",
      "项目内容与想去的方向有关",
      "能承受收入与职业节奏的变化"
    ],
    consequence:
      "没有把项目、行业和去向拆开看，读研可能只是把眼前的焦虑换成更长的空窗。",
    authorityLevel: 3,
    rankingScore: 0.94,
    voteUpCount: 931,
    reviewStatus: "approved_with_caution",
    reviewNote:
      "人工阅读的社区回答。它包含商业合作内容，且是个人判断；只用来拆出核验问题，不作为薪资或录取概率依据。"
  },
  {
    id: "zh-grad-02",
    contentId: "2067738474992625078",
    title: "读博和继续工作该怎么选？",
    url: "https://www.zhihu.com/question/2067227711869826244/answer/2067738474992625078",
    author: "知乎用户",
    contentType: "Answer",
    stance: "conditional",
    categories: ["in-job-validation", "advisor-fit", "career-destination"],
    claim:
      "先在职核对院校、导师、材料和毕业去向，再决定是否离开，通常比先裸辞更能保留选择权。",
    conditions: [
      "现有工作允许留下固定准备时间",
      "申请或备考信息可在离职前获得",
      "目标方向能说清和既有经历的连接"
    ],
    consequence:
      "把“想读”留在想象里，容易在投入大笔时间后才发现方向、门槛或生活条件不匹配。",
    authorityLevel: 3,
    rankingScore: 0.88,
    voteUpCount: 0,
    reviewStatus: "approved_with_caution",
    reviewNote:
      "人工阅读的个案式建议，原文可访问性会变化。它用于提示先核验，不视作所有人都该在职准备的结论。"
  },
  {
    id: "zh-grad-03",
    contentId: "2015432671682122162",
    title: "2026了，计算机专业还有没有必要读研究生？",
    url: "https://www.zhihu.com/question/2015138911668674561/answer/2015432671682122162",
    author: "知乎用户",
    contentType: "Answer",
    stance: "conditional",
    categories: ["industry-fit", "skills", "mentor-fit"],
    claim:
      "读研的收益要落到具体方向、项目和实践机会；只有学位名称，未必能替代真实项目与工作经验。",
    conditions: [
      "专业与行业需求仍有连接",
      "导师或团队的项目方式适合自己",
      "学习期间能持续产出可展示的能力"
    ],
    consequence:
      "如果只为逃离当前工作而选择一个不匹配的项目，毕业时仍可能要重新补职业能力。",
    authorityLevel: 3,
    rankingScore: 0.83,
    voteUpCount: 0,
    reviewStatus: "approved_with_caution",
    reviewNote:
      "人工阅读的职业观点，面向计算机背景，不能外推为其他专业的就业规律；本场景只借用“项目匹配”这一核验维度。"
  },
  {
    id: "zh-grad-04",
    contentId: "1085492275",
    title: "对于学计算机科学的人而言，读研究生有什么意义？",
    url: "https://www.zhihu.com/question/21139858/answer/1085492275",
    author: "知乎用户",
    contentType: "Answer",
    stance: "support",
    categories: ["learning-depth", "practice", "alternatives"],
    claim:
      "学习的价值更应看能否形成解决问题的能力；系统学习、项目实践和灵活学习路径都可能是答案的一部分。",
    conditions: [
      "愿意持续投入并完成高难度学习",
      "课程或项目能和真实问题接上",
      "能区分学习目标和单纯的学历焦虑"
    ],
    consequence: "把读研当作收入承诺，会忽略学习投入、项目质量和其他提升路径。",
    authorityLevel: 2,
    rankingScore: 0.8,
    voteUpCount: 1904,
    reviewStatus: "approved_with_caution",
    reviewNote:
      "原文带有品牌合作内容。人工审核后只保留“能力与实践需要被验证”的观点，不采纳其中的项目推荐。"
  },
  {
    id: "zh-grad-05",
    contentId: "2011118871575295360",
    title: "现实与遗憾的抉择：27岁要不要考全日制研究生？",
    url: "https://www.zhihu.com/question/2007234527064528796/answer/2011118871575295360",
    author: "知乎用户",
    contentType: "Answer",
    stance: "oppose",
    categories: ["full-time-cost", "family-risk", "timing"],
    claim:
      "全日制读研的决定会同时触碰收入、年龄、城市与家庭支持，不能只用“后不后悔”来判断。",
    conditions: [
      "已有稳定工作或共同承担的生活开销",
      "想通过读研转换方向",
      "需要离开当前城市或岗位"
    ],
    consequence:
      "不把生活成本和共同承担者纳入计划，会把个人选择变成周围人被动接住的风险。",
    authorityLevel: 2,
    rankingScore: 0.68,
    voteUpCount: 0,
    reviewStatus: "approved_with_caution",
    reviewNote:
      "问题页及讨论量较小，作为具体困境的线索使用；不把单个回答的经历写成普遍风险。"
  },
  {
    id: "zh-grad-06",
    contentId: "418882636",
    title: "〖择校、择专业〗23考研怎么选择目标院校和专业？",
    url: "https://www.zhihu.com/tardis/zm/art/418882636",
    author: "知乎文章作者",
    contentType: "Article",
    stance: "conditional",
    categories: ["program-selection", "location", "persistence"],
    claim:
      "选项目时，方向、地区、学习方式和自身基础都会影响后续体验，信息不全时不应把学校名当成唯一答案。",
    conditions: [
      "目标专业需要长期投入",
      "地域会影响实习与生活安排",
      "存在全日制、非全或不同培养方式的差异"
    ],
    consequence:
      "只盯着一个标签，容易错过更适配的方向，也会在报名后才发现生活安排无法成立。",
    authorityLevel: 2,
    rankingScore: 0.61,
    voteUpCount: 0,
    reviewStatus: "approved_with_caution",
    reviewNote:
      "人工阅读的备考文章，发布时间较早。它只作为信息清单来源，招生规则必须由用户另查当年官方简章。"
  }
];

function action(
  id: string,
  label: string,
  description: string,
  delta: Partial<typeof zero>,
  fact: string,
  commitment: string,
  irreversibleEvent: string,
  sourceId = "zh-grad-01"
) {
  return {
    id,
    label,
    description,
    delta: { ...zero, ...delta },
    benefits: [fact],
    costs: [commitment],
    addFacts: [fact],
    addCommitments: [commitment],
    irreversibleEvents: [irreversibleEvent],
    sourceIds: [sourceId],
    fallbackOutcome: `${fact}。这不是结论，只是让下一步不再只靠“我感觉可以”来支撑；把它带到下一幕，继续核对它是否经得起真实安排。`
  };
}

function scene(
  id: string,
  act: 1 | 2 | 3,
  timeLabel: string,
  sceneTitle: string,
  setup: string,
  actions: ReturnType<typeof action>[],
  otherWorlds: string[],
  sourceId = "zh-grad-01"
) {
  return {
    id,
    act,
    timeLabel,
    sceneTitle,
    setup,
    fallbackNarrative: `${setup} 你现在能做的不是替未来签保证书，而是把这一步留下能复盘的记录。`,
    sourceIds: [sourceId],
    actions,
    echoes: Object.fromEntries(
      otherWorlds.map((worldId) => [
        worldId,
        {
          title: "另一条路此刻也在动",
          text: `在${worldId === "deepen-work" ? "继续工作的路线" : worldId === "full-time-prep" ? "集中备考的路线" : "在职验证的路线"}里，同样的时间正在被用在另一种承诺上。不是比较谁更勇敢，而是比较谁在为哪种代价买单。`,
          sourceIds: [sourceId]
        }
      ])
    )
  };
}

const deepenActions = [
  action(
    "work-1-role-map",
    "和主管把下一阶段职责说具体",
    "不先假设留下就会成长，直接问清未来半年能接到什么项目和决策权。",
    { growthSlope: 7, valueAlignment: 2, wellbeingLoad: 2 },
    "拿到一份可核对的职责清单",
    "约定下次复盘时间",
    "向团队公开表达发展诉求",
    "zh-grad-01"
  ),
  action(
    "work-1-skill-inventory",
    "盘点能带走的硬技能",
    "把现岗位的项目、方法和成果写成可投递的能力清单。",
    { careerOptionality: 6, growthSlope: 4 },
    "完成一页能力与缺口地图",
    "腾出一个晚上整理材料",
    "看见现有能力的真实缺口",
    "zh-grad-03"
  ),
  action(
    "work-1-market-call",
    "约一次外部岗位信息面",
    "找一个目标方向的从业者，问门槛、日常工作和入场路径。",
    { careerOptionality: 5, relationshipCapital: 3, wellbeingLoad: 1 },
    "得到一条外部岗位的一手反馈",
    "发出求助和约谈邀请",
    "把外部机会变成可比较对象",
    "zh-grad-02"
  )
];

const prepActions = [
  action(
    "prep-1-budget",
    "算出 12 个月的生活和备考账",
    "把学费、房租、家庭支持和最坏情况下的空档写进同一张表。",
    { cashSafety: -5, valueAlignment: 3, wellbeingLoad: 2 },
    "算清全职准备的现金红线",
    "花一晚核对真实支出",
    "家人会知道你的资金计划",
    "zh-grad-05"
  ),
  action(
    "prep-1-eligibility",
    "核对报考资格和时间线",
    "把三个目标项目的简章、材料、考试日期与离职节点逐项对照。",
    { careerOptionality: 5, wellbeingLoad: 2 },
    "得到一张明确的报名时间表",
    "开始处理材料和证明",
    "放弃不符合条件的项目",
    "zh-grad-06"
  ),
  action(
    "prep-1-family-talk",
    "把离职风险讲给共同承担者听",
    "不只说理想，把收入中断、生活调整和最坏结果一起摊开。",
    { relationshipCapital: 6, wellbeingLoad: 3 },
    "共同承担者知道最坏情形",
    "安排一次不舒服但必要的谈话",
    "家庭会对计划提出具体边界",
    "zh-grad-05"
  )
];

const bridgeActions = [
  action(
    "bridge-1-admissions-audit",
    "查清三个目标项目的硬门槛",
    "逐项看简章、课程、导师或项目去向，删掉只有名气没有匹配的选项。",
    { careerOptionality: 7, valueAlignment: 4, wellbeingLoad: 2 },
    "留下三所可比较的项目卡",
    "用两个晚上查材料",
    "不再把学校名当成唯一标准",
    "zh-grad-06"
  ),
  action(
    "bridge-1-work-boundary",
    "给现在的工作设一个可控边界",
    "和主管确认一段不被临时任务吞掉的学习时间，先试可不可行。",
    { cashSafety: 3, relationshipCapital: 3, wellbeingLoad: 2 },
    "拿到一段可验证的固定学习时间",
    "减少部分临时加班弹性",
    "工作安排会被明确调整",
    "zh-grad-02"
  ),
  action(
    "bridge-1-evening-trial",
    "做一周晚间学习实测",
    "不要凭意志力估算，连续七天记录下班后真实可用的专注时段。",
    { growthSlope: 5, wellbeingLoad: 5, valueAlignment: 3 },
    "得到一周真实的学习负荷记录",
    "占用七个晚上的休息时间",
    "你会看见自己能否长期坚持",
    "zh-grad-04"
  )
];

const scenario = {
  schemaVersion: 1,
  scenarioId: "graduate-school",
  title: "继续工作，还是辞职准备读研？",
  subtitle: "你想要的不是一张“更好”的文凭，而是下一段职业路的真实入口。",
  disclaimer:
    "本推演用于拆开机会成本、项目匹配与共同风险，不替代招生政策、职业咨询或个人决定。",
  commonBaseline: {
    cashSafety: 62,
    careerOptionality: 58,
    growthSlope: 48,
    relationshipCapital: 62,
    wellbeingLoad: 46,
    valueAlignment: 50
  },
  stateModel: {
    range: [0, 100] as [0, 100],
    dimensions: {
      cashSafety: { label: "手头余量", higherIsBetter: true },
      careerOptionality: { label: "职业选择", higherIsBetter: true },
      growthSlope: { label: "学习势头", higherIsBetter: true },
      relationshipCapital: { label: "共同支持", higherIsBetter: true },
      wellbeingLoad: { label: "身心负荷", higherIsBetter: false },
      valueAlignment: { label: "方向感", higherIsBetter: true }
    }
  },
  calibrationRules: [
    "先算能撑多久，再谈离不离职",
    "学历、方向和目标岗位要分别核对",
    "共同承担的时间和钱，要提前说清"
  ],
  worlds: [
    {
      id: "deepen-work",
      name: "把工作做深",
      tagline: "先把现有平台用到尽头",
      initialState: {
        cashSafety: 76,
        careerOptionality: 62,
        growthSlope: 50,
        relationshipCapital: 68,
        wellbeingLoad: 42,
        valueAlignment: 49
      },
      startingPoint:
        "你保留收入与节奏，但得验证留下是否真能换来更难的事和更宽的选择。",
      acts: [
        scene(
          "work-act-1",
          1,
          "SCENE 01 / 当下岗位",
          "这份工作还能不能长出下一段？",
          "你不急着做离职决定，先看眼前这份工作到底还能给你什么。",
          deepenActions,
          ["full-time-prep", "dual-track"],
          "zh-grad-01"
        ),
        scene(
          "work-act-2",
          2,
          "SCENE 02 / 三个月后",
          "把成长写进日历",
          "主管愿意谈发展，但没有人会自动替你留出成长空间。",
          [
            action(
              "work-2-stretch-project",
              "接一个能写进简历的难项目",
              "主动争取跨团队或高难任务，把“成长”变成可展示的交付。",
              { growthSlope: 8, wellbeingLoad: 5, careerOptionality: 3 },
              "拿到一个高难度交付机会",
              "未来六周承担额外责任",
              "项目成败会直接影响评价",
              "zh-grad-03"
            ),
            action(
              "work-2-learning-plan",
              "用固定节奏补目标能力",
              "挑一项对目标方向真正有用的技能，设一个月可完成的产出。",
              { growthSlope: 6, valueAlignment: 4, wellbeingLoad: 3 },
              "有了可检查的学习产出",
              "每周留出四个固定时段",
              "减少即时娱乐和社交时间",
              "zh-grad-04"
            ),
            action(
              "work-2-switch-probe",
              "小范围试探转向机会",
              "把能力清单投给两个相邻岗位，看看市场要你补什么。",
              {
                careerOptionality: 8,
                relationshipCapital: 2,
                wellbeingLoad: 2
              },
              "拿到两个岗位的真实反馈",
              "暴露目前能力短板",
              "外部人会知道你在探索",
              "zh-grad-02"
            )
          ],
          ["full-time-prep", "dual-track"],
          "zh-grad-03"
        ),
        scene(
          "work-act-3",
          3,
          "SCENE 03 / 节点前",
          "留下，也要留下一个期限",
          "你发现稳定不是坏事，但它也会让“以后再说”变得太容易。",
          [
            action(
              "work-3-growth-contract",
              "和主管写下半年成长约定",
              "把职责、项目和复盘日期落到书面，不再只听一句“以后会有机会”。",
              { growthSlope: 6, relationshipCapital: 2, valueAlignment: 3 },
              "半年成长目标被写下来",
              "接受一个明确的复盘节点",
              "到期必须面对是否兑现",
              "zh-grad-01"
            ),
            action(
              "work-3-apply-part-time",
              "保留工作，申请灵活学习路径",
              "把申请当成探索，不马上让收入和学习形成硬切换。",
              { careerOptionality: 6, cashSafety: 1, wellbeingLoad: 4 },
              "保留一条学习申请通道",
              "周末和晚上被更紧地占用",
              "报名与工作时间开始冲突",
              "zh-grad-04"
            ),
            action(
              "work-3-commit-current",
              "先承诺当前赛道一年",
              "暂停读研计划，用一年把现岗位的深度和外部选择做实。",
              { cashSafety: 5, growthSlope: 3, valueAlignment: -2 },
              "一年主线被确定",
              "暂时放下备考窗口",
              "错过本轮报名可能性",
              "zh-grad-01"
            )
          ],
          ["full-time-prep", "dual-track"],
          "zh-grad-01"
        )
      ]
    },
    {
      id: "full-time-prep",
      name: "辞职集中备考",
      tagline: "用时间换一次重启机会",
      initialState: {
        cashSafety: 47,
        careerOptionality: 54,
        growthSlope: 62,
        relationshipCapital: 56,
        wellbeingLoad: 58,
        valueAlignment: 65
      },
      startingPoint:
        "你愿意把时间押给准备，但得先证明这不是逃离现在，而是通向一个说得清的目标。",
      acts: [
        scene(
          "prep-act-1",
          1,
          "SCENE 01 / 辞职之前",
          "离职前，先把账算完",
          "全职准备看起来很纯粹，但收入中断、材料节点和家人的感受会同时出现。",
          prepActions,
          ["deepen-work", "dual-track"],
          "zh-grad-05"
        ),
        scene(
          "prep-act-2",
          2,
          "SCENE 02 / 备考第六周",
          "坐得住，才算真的能准备",
          "时间突然多出来后，焦虑没有消失，只是换成了每天要面对的自我管理。",
          [
            action(
              "prep-2-mock-exam",
              "按真实时段做一次完整模考",
              "用一整天模拟考试，记录分数、体力和最薄弱的一环。",
              { growthSlope: 6, wellbeingLoad: 6, valueAlignment: 2 },
              "拿到第一份真实模考记录",
              "交出一个完整周末",
              "会看见当前差距",
              "zh-grad-06"
            ),
            action(
              "prep-2-study-partner",
              "找一个能对照进度的人",
              "和同伴每周互看计划、完成量和临时放弃的原因。",
              { relationshipCapital: 5, growthSlope: 4, wellbeingLoad: -1 },
              "建立每周复盘关系",
              "把学习进度交给别人看",
              "计划失约会被看见",
              "zh-grad-04"
            ),
            action(
              "prep-2-career-bridge",
              "联系目标领域的一位从业者",
              "确认读完以后最想去的岗位到底看什么，而不是只问学校好不好。",
              { careerOptionality: 7, valueAlignment: 4, wellbeingLoad: 2 },
              "得到目标岗位的能力清单",
              "承认学位之外还要补能力",
              "目标可能需要被调整",
              "zh-grad-01"
            )
          ],
          ["deepen-work", "dual-track"],
          "zh-grad-02"
        ),
        scene(
          "prep-act-3",
          3,
          "SCENE 03 / 报名节点",
          "把退路也写进计划",
          "你已经投入了时间。现在最难的不是坚持，而是承认可能需要换一个项目或保留回到工作的门。",
          [
            action(
              "prep-3-submit-resignation",
              "递交辞呈，锁定全职备考",
              "在材料与预算确认后正式离开，把未来一段时间交给备考。",
              {
                cashSafety: -10,
                growthSlope: 7,
                valueAlignment: 5,
                wellbeingLoad: 5
              },
              "全职备考正式开始",
              "失去稳定工资",
              "离职决定不可逆地生效",
              "zh-grad-05"
            ),
            action(
              "prep-3-delay-decision",
              "把离职延到拿到关键反馈后",
              "保留当前工作一个月，等模考、材料或项目反馈出来再做切换。",
              { cashSafety: 4, careerOptionality: 5, wellbeingLoad: 4 },
              "离职被改成有条件的决定",
              "继续承受双线负荷",
              "错过部分全职准备时间",
              "zh-grad-02"
            ),
            action(
              "prep-3-change-target",
              "换成更匹配的项目组合",
              "不因为已经投入而硬冲原目标，按资格、方向和生活条件重新排优先级。",
              { careerOptionality: 5, valueAlignment: 6, wellbeingLoad: -2 },
              "项目组合被重新校准",
              "放弃一个曾经执着的目标",
              "报名策略不可逆地变化",
              "zh-grad-06"
            )
          ],
          ["deepen-work", "dual-track"],
          "zh-grad-06"
        )
      ]
    },
    {
      id: "dual-track",
      name: "在职验证再决定",
      tagline: "先验证，后切换",
      initialState: {
        cashSafety: 68,
        careerOptionality: 69,
        growthSlope: 58,
        relationshipCapital: 61,
        wellbeingLoad: 57,
        valueAlignment: 60
      },
      startingPoint:
        "你暂时不离职，用一段有限的双线时间，换取关于项目、能力和生活负荷的真信息。",
      acts: [
        scene(
          "bridge-act-1",
          1,
          "SCENE 01 / 选择之前",
          "先别辞，给目标一次真实碰撞",
          "读研的想法很强，但你还没确认它对应的是哪个项目、哪种能力和哪种生活。",
          bridgeActions,
          ["deepen-work", "full-time-prep"],
          "zh-grad-06"
        ),
        scene(
          "bridge-act-2",
          2,
          "SCENE 02 / 验证第二周",
          "把“我想读”换成“我能完成”",
          "信息收集差不多了，接下来要验证的是：你能不能在现实节奏里做出申请或备考的核心产出。",
          [
            action(
              "bridge-2-one-page-plan",
              "写一页转向说明",
              "用一页纸讲清楚想去哪、为什么是这个项目、现有经历怎么接上。",
              { valueAlignment: 7, careerOptionality: 4, wellbeingLoad: 2 },
              "写出可被别人质疑的转向说明",
              "花一个周末整理经历",
              "目标会变得具体且可被反驳",
              "zh-grad-02"
            ),
            action(
              "bridge-2-alumni-call",
              "找一位在读或毕业的人问细节",
              "不问“值不值”，只问课程、导师、实习、压力和毕业后的第一份工作。",
              {
                careerOptionality: 7,
                relationshipCapital: 4,
                wellbeingLoad: 1
              },
              "得到一份项目体验核对表",
              "发出一封有准备的联系",
              "理想化想象会被具体细节打断",
              "zh-grad-01"
            ),
            action(
              "bridge-2-real-paper",
              "用真题测一次当前差距",
              "按真实时间做一套题或完成一次项目任务，不用“以后努力”代替基线。",
              { growthSlope: 6, wellbeingLoad: 5, valueAlignment: 2 },
              "拿到可量化的能力基线",
              "占用一整个休息日",
              "你会知道准备周期是否需要重算",
              "zh-grad-06"
            )
          ],
          ["deepen-work", "full-time-prep"],
          "zh-grad-03"
        ),
        scene(
          "bridge-act-3",
          3,
          "SCENE 03 / 报名之前",
          "报名之前，留下退出门",
          "你已经拿到一部分证据。现在该决定是继续在职、提交申请，还是为全职准备设一个明确触发条件。",
          [
            action(
              "bridge-3-submit-while-working",
              "提交申请，同时保留工作选项",
              "按当前节奏递交材料或报名，不把录取前的可能性当成已经发生的未来。",
              { careerOptionality: 7, cashSafety: 3, wellbeingLoad: 4 },
              "申请与工作两条线同时存在",
              "未来数周仍要管理双线负荷",
              "一个报名节点被正式锁定",
              "zh-grad-02"
            ),
            action(
              "bridge-3-triggered-leave",
              "设定证据达标后再离职",
              "只在拿到明确资格、成绩或录取信号后启动离职，而不是按情绪切换。",
              { cashSafety: 5, valueAlignment: 5, wellbeingLoad: 1 },
              "离职有了可核验的触发条件",
              "接受短期不能全力备考",
              "到达触发条件时必须执行选择",
              "zh-grad-01"
            ),
            action(
              "bridge-3-stay-and-skill",
              "暂不申请，先用半年补能力",
              "承认当前项目不匹配，把准备转成一段不会浪费的能力建设。",
              { growthSlope: 6, cashSafety: 4, valueAlignment: 3 },
              "形成一份半年能力计划",
              "推迟本轮报名",
              "短期不再以学位为主线",
              "zh-grad-04"
            )
          ],
          ["deepen-work", "full-time-prep"],
          "zh-grad-04"
        )
      ]
    }
  ]
};

const worldIds = ["deepen-work", "full-time-prep", "dual-track"];
const actionIds = scenario.worlds.flatMap((world) =>
  world.acts.flatMap((act) => act.actions.map((item) => item.id))
);

function assumption(
  id: string,
  label: string,
  premise: string,
  sourceId: string
) {
  return {
    id,
    label,
    premise,
    checkQuestion: "七天后，哪一种结果最接近你实际拿到的材料、反馈或完成记录？",
    evidenceOptions: [
      {
        id: `${id}-supported`,
        label: "证据支持",
        detail: "关键材料、反馈和实际进度都对得上。",
        result: "supported"
      },
      {
        id: `${id}-contradicted`,
        label: "证据冲突",
        detail: "有一项关键事实和原先想的不一样。",
        result: "contradicted"
      },
      {
        id: `${id}-inconclusive`,
        label: "暂时不清楚",
        detail: "信息还不够，不能提前给自己下结论。",
        result: "inconclusive"
      }
    ],
    outcomes: {
      supported: {
        label: "事实暂时站得住",
        narrative: "你拿到了能支撑这一步的材料，但仍要按边界继续复盘。",
        stateEffect: "keep",
        fact: "关键假设得到当前证据支持",
        irreversibleEvent: "下一步可以按原计划推进"
      },
      contradicted: {
        label: "事情和想的不一样",
        narrative:
          "关键事实没有如预期成立。现在更重要的是调整投入，而不是替原决定找借口。",
        stateEffect: "reversal",
        fact: "关键假设被现实证据推翻",
        irreversibleEvent: "原计划需要重新排期"
      },
      inconclusive: {
        label: "答案还不够",
        narrative:
          "这不是失败，只是还不能把希望当作证据；先把缺的那条信息补回来。",
        stateEffect: "uncertain",
        fact: "关键假设暂时没有足够证据",
        irreversibleEvent: "下一步被限定为补齐证据"
      }
    },
    reversal: "不要把一个没有被验证的假设，偷偷当成已经发生的结果。",
    sourceIds: [sourceId],
    deltaByWorld: Object.fromEntries(
      worldIds.map((worldId) => [
        worldId,
        {
          ...zero,
          cashSafety: worldId === "full-time-prep" ? -8 : -3,
          careerOptionality: -6,
          wellbeingLoad: 5,
          valueAlignment: -4
        }
      ])
    ),
    addedFactsByWorld: Object.fromEntries(
      worldIds.map((worldId) => [worldId, [`${worldId}路线的关键前提没有成立`]])
    ),
    irreversibleEventsByWorld: Object.fromEntries(
      worldIds.map((worldId) => [worldId, [`${worldId}路线需要重新安排下一步`]])
    ),
    fallbackNarrativeByWorld: Object.fromEntries(
      worldIds.map((worldId) => [
        worldId,
        `在${worldId === "deepen-work" ? "工作深化" : worldId === "full-time-prep" ? "集中备考" : "在职验证"}这条路上，原先以为稳妥的前提没有成立。你保住的不是面子，而是及时把投入拉回现实的机会。`
      ])
    ),
    realityTest: [
      "把关键材料放在同一页核对",
      "找一个不替你做决定的人挑错",
      "写下证据不足时的停止或改道条件"
    ]
  };
}

const outcomeTemplates = {
  schemaVersion: 1,
  scenarioId: "graduate-school",
  resultSections: [
    {
      id: "choice",
      title: "你走过的路线",
      description: "不是正确答案，而是你愿意先承担的那组代价。"
    },
    {
      id: "evidence",
      title: "现实证据",
      description: "把期待、材料和实际反馈分开看。"
    },
    {
      id: "next",
      title: "下一步实验",
      description: "用一个小而可退出的动作继续核验。"
    }
  ],
  assumptionBlasts: [
    assumption(
      "degree-opens-door",
      "拿到学位，就能打开想去的赛道",
      "你把读研当作职业转换的主要入口。",
      "zh-grad-01"
    ),
    assumption(
      "study-time-exists",
      "我只要辞职，就一定能稳定高效地学习",
      "你相信时间释放后，执行力会自动出现。",
      "zh-grad-04"
    ),
    assumption(
      "current-job-dead-end",
      "现在这份工作已经没有任何成长空间",
      "你把留下看成停滞，把离开看成唯一变化。",
      "zh-grad-03"
    )
  ],
  blindSpots: actionIds.map((actionId, index) => ({
    id: `grad-blind-${String(index + 1).padStart(2, "0")}`,
    title: ["把项目名当成结果", "只算学费，没算生活", "把意志力当成时间表"][
      index % 3
    ],
    triggerActionIds: [actionId],
    text: `你已经做了“${
      scenario.worlds
        .flatMap((world) => world.acts)
        .flatMap((act) => act.actions)
        .find((item) => item.id === actionId)?.label
    }”。别忘了：这一步的价值在于拿到证据，不在于证明自己一开始就是对的。`,
    sourceIds: [sourceIds[index % sourceIds.length]]
  })),
  futureLetters: worldIds.flatMap((worldId) => [
    {
      id: `${worldId}-letter-cash`,
      worldId,
      tone: "一年后的你",
      condition: "cashSafety < 50",
      template:
        "一年后的你说：我后来才明白，最难的不是选哪条路，而是承认钱和时间都会反过来决定我能坚持多久。那时我庆幸自己至少留下了清楚的红线。",
      sourceIds: ["zh-grad-05"]
    },
    {
      id: `${worldId}-letter-growth`,
      worldId,
      tone: "一年后的你",
      condition: "growthSlope >= 65",
      template:
        "一年后的你说：真正把我往前推的，不是某个身份，而是我开始持续交出作品、申请和真实反馈。选择只是开始，持续行动才是后面的路。",
      sourceIds: ["zh-grad-04"]
    },
    {
      id: `${worldId}-letter-default`,
      worldId,
      tone: "一年后的你",
      condition: "valueAlignment >= 0",
      template:
        "一年后的你说：我没有找到一条没有代价的路，但我开始知道自己为什么付这个代价，也知道什么时候应该停下来重新看一眼。",
      sourceIds: ["zh-grad-01"]
    }
  ]),
  sevenDayExperiments: actionIds.map((actionId, index) => {
    const worldId =
      scenario.worlds.find((world) =>
        world.acts.some((act) =>
          act.actions.some((item) => item.id === actionId)
        )
      )?.id ?? "dual-track";
    const finalAction = actionId.includes("-3-");
    const routeName =
      scenario.worlds.find((world) => world.id === worldId)?.name ?? "当前路线";
    return {
      id: `grad-test-${String(index + 1).padStart(2, "0")}`,
      title: finalAction
        ? `${routeName}七天现实核验`
        : `${routeName}的一个小验证`,
      triggerActionIds: [actionId],
      worldIds: [worldId],
      assumptionResults: finalAction
        ? ["supported", "contradicted", "inconclusive"]
        : undefined,
      statePressureKeys:
        worldId === "full-time-prep"
          ? ["cashSafety", "wellbeingLoad"]
          : worldId === "dual-track"
            ? ["wellbeingLoad", "careerOptionality"]
            : ["growthSlope"],
      priority: finalAction ? 30 : 3,
      question: finalAction
        ? "这条路的关键前提，能不能在真实一周里留下证据？"
        : "这一步有没有把你的想法推进到一条可核对的记录？",
      whyNow:
        "报告不是终点。先用一周小成本验证，避免把想象直接升级成不可逆承诺。",
      steps: [
        "写下这周只要验证的一件事",
        "每天留下一条完成记录或阻碍",
        "第七天按证据决定继续、调整还是暂停"
      ],
      simulationDays: [
        {
          day: 1,
          title: "把问题缩小",
          situation: "先别安排一整个人生，只选一个最想证明的事实。",
          action: "写下本周唯一问题和完成标准。",
          evidence: "问题与标准被写进记录。",
          choices: ["查项目材料", "安排学习时段", "联系一位相关的人"],
          evidencePrompt: "今天留下了什么可核对的材料？"
        },
        {
          day: 2,
          title: "找到第一手信息",
          situation: "开始找简章、岗位说明、课程或真实经历，而不是继续刷结论。",
          action: "保存一条能改变判断的原始信息。",
          evidence: "来源和适用条件被记录。",
          choices: ["核对官方规则", "看目标岗位", "整理已有经历"],
          evidencePrompt: "哪一条信息让你改了看法？"
        },
        {
          day: 3,
          title: "做一次真实动作",
          situation: "把准备从阅读切到提交、练习或联系。",
          action: "完成一个有截止时间的实际动作。",
          evidence: "留下完成物或对方回复。",
          choices: ["做一段真题", "写一页说明", "发出联系"],
          evidencePrompt: "完成物是什么？"
        },
        {
          day: 4,
          title: "意外出现",
          situation: "工作、疲惫或材料缺口打乱计划，这正是要记录的现实。",
          action: "写下被打断的原因，并决定是调小还是补救。",
          evidence: "障碍和调整动作被记录。",
          choices: ["缩小任务", "重新排期", "请求帮助"],
          evidencePrompt: "今天的阻碍到底是什么？",
          surprise: true
        },
        {
          day: 5,
          title: "找人挑错",
          situation: "请一个不替你做决定的人，指出计划里的空话和漏项。",
          action: "带着具体问题要一次反馈。",
          evidence: "收到至少一条可执行的反问或建议。",
          choices: ["问在读者", "问从业者", "问共同承担者"],
          evidencePrompt: "对方指出了什么盲点？"
        },
        {
          day: 6,
          title: "把账补齐",
          situation: "把时间、钱和精力放回同一张表，看看这周到底花了什么。",
          action: "补齐实际投入与下周边界。",
          evidence: "真实投入和上限被写下。",
          choices: ["算时间", "算现金", "安排边界"],
          evidencePrompt: "哪一项成本被你低估了？"
        },
        {
          day: 7,
          title: "只按证据复盘",
          situation:
            "一周结束。现在不是评判自己够不够努力，而是判断证据朝哪个方向走。",
          action: "选出最接近的结果，并写下下一步。",
          evidence: "有一条继续、调整或暂停的具体动作。",
          choices: ["继续验证", "调整目标", "暂停投入"],
          evidencePrompt: "下周最具体的一步是什么？"
        }
      ],
      evidence: "一周内留下的原始材料、完成物、反馈和实际投入记录。",
      resultMeaning: {
        supported: "关键前提暂时站得住，可以在边界内继续。",
        contradicted: "关键前提被现实推翻，先调整目标或降低投入。",
        inconclusive: "记录不够，不把愿望当成答案。"
      },
      nextStep: {
        supported: "把通过的条件写进下一阶段计划，并保留复盘日期。",
        contradicted: "先改掉被推翻的前提，再决定是否继续投入。",
        inconclusive: "只补一条最关键证据，设一个新的短期限。"
      },
      timeBudget: "每天 20–45 分钟",
      moneyBudget: "0–100 元",
      exitRule: "若连续两天没有可用时间或关键前提被推翻，暂停加码，先复盘。",
      sourceIds: [sourceIds[index % sourceIds.length]]
    };
  }),
  offlineFallback: {
    selectionRule:
      "优先匹配当前路线的最终行动、假设结果和压力维度；没有命中时选择当前路线的基础核验。",
    futureLetterLabel: "这是基于选择生成的反思文本，不是对现实未来的预测。",
    sourceDisclaimer:
      "知乎内容是人工审核的社区经验样本，不能替代当年招生简章、职业建议或对个人结果的承诺。",
    minimumSources: 3
  }
};

export const graduateRawContent: RawDemoContent = {
  sourceCards: {
    schemaVersion: 1,
    scenarioId: "graduate-school",
    scenarioTitle: "继续工作，还是辞职准备读研？",
    retrievedAt: "2026-09-09",
    source: "zhihu_open_platform",
    reviewPolicy: "community_experience_for_scenario_only",
    cards
  },
  scenario,
  outcomes: outcomeTemplates
};
