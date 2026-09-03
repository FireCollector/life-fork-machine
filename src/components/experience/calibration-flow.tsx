"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleGauge,
  Compass,
  HeartHandshake,
  ShieldAlert,
  Sparkles,
  WalletCards,
  type LucideIcon
} from "lucide-react";

import { PageFrame } from "@/components/experience/page-frame";
import { Button } from "@/components/ui/button";
import {
  CalibrationAnswersSchema,
  getCalibrationDelta,
  saveCalibration,
  type CalibrationAnswers,
  type StateDelta
} from "@/features/game";
import { useStoredCalibration } from "@/features/game/use-stored-calibration";
import { cn } from "@/lib/utils";

type AnswerValue = CalibrationAnswers[keyof CalibrationAnswers];

interface Question {
  key: keyof CalibrationAnswers;
  eyebrow: string;
  title: string;
  hint: string;
  icon: LucideIcon;
  options: Array<{ value: AnswerValue; label: string; detail: string }>;
}

const questions: Question[] = [
  {
    key: "runway",
    eyebrow: "现金安全垫",
    title: "如果明天停止工作，你可以维持多久？",
    hint: "只计算可以自由支配的现金，不把未到账奖金或口头融资算进去。",
    icon: WalletCards,
    options: [
      {
        value: "under-3",
        label: "少于 3 个月",
        detail: "任何收入中断都会迅速触碰红线"
      },
      {
        value: "3-6",
        label: "3–6 个月",
        detail: "可以短期试错，但退出窗口较窄"
      },
      {
        value: "6-12",
        label: "6–12 个月",
        detail: "拥有一段验证期，仍需明确止损"
      },
      {
        value: "12-24",
        label: "12–24 个月",
        detail: "能够承担中期波动与转轨成本"
      },
      {
        value: "over-24",
        label: "超过 24 个月",
        detail: "现金压力较低，但机会成本仍存在"
      }
    ]
  },
  {
    key: "sharedRisk",
    eyebrow: "共同承担者",
    title: "这次选择的后果，会由谁一起承担？",
    hint: "共同生活者承担的时间、照护与情绪劳动，也属于真实成本。",
    icon: HeartHandshake,
    options: [
      { value: "self", label: "主要是我自己", detail: "风险边界主要由你定义" },
      {
        value: "partner",
        label: "我和伴侣",
        detail: "现金与时间安排需要共同确认"
      },
      {
        value: "dependents",
        label: "父母或孩子",
        detail: "刚性支出和照护责任更高"
      },
      {
        value: "multiple",
        label: "多方共同承担",
        detail: "任何不可逆动作都需要更强共识"
      }
    ]
  },
  {
    key: "primaryFear",
    eyebrow: "最重的损失",
    title: "一年后回看，你最不愿意承受哪一种代价？",
    hint: "不是问你更勇敢还是更保守，而是找出最需要被压力测试的脆弱点。",
    icon: ShieldAlert,
    options: [
      {
        value: "miss-opportunity",
        label: "错过关键机会",
        detail: "害怕窗口关闭后再也无法回到牌桌"
      },
      {
        value: "financial-loss",
        label: "经济失控",
        detail: "害怕现金跑道和生活安排被打穿"
      },
      {
        value: "relationship-damage",
        label: "关系受损",
        detail: "害怕合作冲突蔓延到重要关系"
      },
      {
        value: "growth-stagnation",
        label: "能力停滞",
        detail: "害怕稳定逐渐变成路径依赖"
      }
    ]
  },
  {
    key: "primaryGoal",
    eyebrow: "当前渴望",
    title: "如果只能优先得到一样，你此刻最想要什么？",
    hint: "选择一个当前优先级，不代表其他价值不重要。",
    icon: Sparkles,
    options: [
      {
        value: "stability",
        label: "稳定",
        detail: "可安排的生活和确定的现金流"
      },
      { value: "growth", label: "成长", detail: "更陡的学习曲线与责任范围" },
      { value: "autonomy", label: "自主权", detail: "更大决策空间与可选择性" },
      { value: "meaning", label: "意义感", detail: "工作与长期价值更一致" }
    ]
  },
  {
    key: "uncertaintyStyle",
    eyebrow: "不确定性偏好",
    title: "面对一个没有完整答案的问题，你通常怎么开始？",
    hint: "它只影响系统如何呈现建议，不会替你决定进入哪条世界。",
    icon: Compass,
    options: [
      {
        value: "act-first",
        label: "先行动再修正",
        detail: "用快速反馈换取方向感"
      },
      {
        value: "validate-first",
        label: "先验证关键假设",
        detail: "先购买信息，再承诺资源"
      },
      {
        value: "prepare-first",
        label: "准备充分再开始",
        detail: "先扩大安全边界和退出空间"
      }
    ]
  }
];

const dimensionLabels: Record<keyof StateDelta, string> = {
  cashSafety: "手头资金",
  careerOptionality: "找工作余地",
  growthSlope: "成长速度",
  relationshipCapital: "关系状况",
  wellbeingLoad: "身心压力",
  valueAlignment: "符合内心"
};

export function CalibrationFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const savedAnswers = useStoredCalibration();
  const [draftAnswers, setDraftAnswers] =
    useState<Partial<CalibrationAnswers>>();
  const answers = draftAnswers ?? savedAnswers ?? {};
  const parsed = CalibrationAnswersSchema.safeParse(answers);
  const delta = useMemo(
    () => (parsed.success ? getCalibrationDelta(parsed.data) : undefined),
    [parsed]
  );
  const question = questions[step];
  const selectedValue = answers[question.key];

  function choose(value: AnswerValue) {
    setDraftAnswers((current) => ({
      ...(current ?? savedAnswers),
      [question.key]: value
    }));
  }

  function continueForward() {
    if (selectedValue && step < questions.length - 1)
      setStep((current) => current + 1);
  }

  function sendToForge() {
    const complete = CalibrationAnswersSchema.parse(answers);
    saveCalibration(window.localStorage, complete);
    router.push("/forge");
  }

  const Icon = question.icon;
  const progress = ((step + 1) / questions.length) * 100;

  return (
    <PageFrame
      actions={
        <Button asChild size="sm" variant="ghost">
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            返回困境
          </Link>
        </Button>
      }
      description="不是性格测试。五个问题只用于校准你能承受的现金、关系与不确定性边界，不生成标签。"
      eyebrow="01 / CALIBRATE"
      step={1}
      title="先告诉机器，什么代价对你最重。"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="glass-panel rounded-3xl border border-white/10 p-5 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <span className="border-zhihu/25 bg-zhihu/10 rounded-full border px-3 py-1 text-xs font-medium text-blue-200">
              问题 {step + 1} / {questions.length}
            </span>
            <span className="text-muted-foreground text-xs">
              已回答 {Object.keys(answers).length} 项
            </span>
          </div>
          <div
            aria-label={`校准进度 ${step + 1} / ${questions.length}`}
            aria-valuemax={questions.length}
            aria-valuemin={1}
            aria-valuenow={step + 1}
            className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
            role="progressbar"
          >
            <div
              className="bg-zhihu h-full rounded-full transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-9 flex items-start gap-4" key={question.key}>
            <span className="bg-zhihu/10 flex size-11 shrink-0 items-center justify-center rounded-2xl text-blue-300">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
                {question.eyebrow}
              </p>
              <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
                {question.title}
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
                {question.hint}
              </p>
            </div>
          </div>

          <fieldset className="mt-7 grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">{question.title}</legend>
            {question.options.map((option) => {
              const selected = selectedValue === option.value;
              return (
                <button
                  aria-pressed={selected}
                  className={cn(
                    "min-h-20 rounded-2xl border px-4 py-3 text-left transition-colors",
                    selected
                      ? "border-zhihu/60 bg-zhihu/15 shadow-[inset_0_0_0_1px_rgb(23_114_246/0.2)]"
                      : "hover:border-zhihu/35 hover:bg-zhihu/[0.07] border-white/[0.09] bg-white/[0.025]"
                  )}
                  key={option.value}
                  onClick={() => choose(option.value)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-3 text-sm font-medium text-white">
                    {option.label}
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border",
                        selected
                          ? "border-zhihu bg-zhihu text-white"
                          : "border-white/15 text-transparent"
                      )}
                    >
                      <Check aria-hidden="true" className="size-3" />
                    </span>
                  </span>
                  <span className="text-muted-foreground mt-1.5 block text-xs leading-5">
                    {option.detail}
                  </span>
                </button>
              );
            })}
          </fieldset>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
            <Button
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              variant="ghost"
            >
              <ArrowLeft aria-hidden="true" />
              上一题
            </Button>
            {step < questions.length - 1 ? (
              <Button disabled={!selectedValue} onClick={continueForward}>
                下一题
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button
                disabled={!parsed.success}
                onClick={sendToForge}
                size="lg"
              >
                送入证据熔炉
                <ArrowRight aria-hidden="true" />
              </Button>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <CircleGauge
                aria-hidden="true"
                className="size-4 text-blue-300"
              />
              约束校准结果
            </div>
            {delta ? (
              <div className="mt-5 space-y-3" aria-live="polite">
                {(Object.keys(dimensionLabels) as Array<keyof StateDelta>).map(
                  (key) => {
                    const value = delta[key];
                    const riskValue = key === "wellbeingLoad" ? value : -value;
                    return (
                      <div
                        className="flex items-center justify-between gap-3"
                        key={key}
                      >
                        <span className="text-muted-foreground text-xs">
                          {dimensionLabels[key]}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-mono text-xs",
                            value === 0
                              ? "bg-white/[0.05] text-white/55"
                              : riskValue > 0
                                ? "bg-world-leap/10 text-world-leap"
                                : "bg-signal-lime/10 text-signal-lime"
                          )}
                        >
                          {value > 0 ? "+" : ""}
                          {value}
                        </span>
                      </div>
                    );
                  }
                )}
                <p className="border-zhihu/15 bg-zhihu/[0.06] mt-4 rounded-xl border p-3 text-xs leading-5 text-blue-100/70">
                  数值只校准这局推演对代价的敏感度，不是人格评分，也不会自动替你选择世界。
                </p>
              </div>
            ) : (
              <div className="mt-6 flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-5 text-center">
                <CircleGauge
                  aria-hidden="true"
                  className="size-7 text-white/20"
                />
                <p className="mt-3 text-sm font-medium">
                  还差 {questions.length - Object.keys(answers).length} 项
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  完成后只显示约束修正，不生成任何人格名称。
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </PageFrame>
  );
}
