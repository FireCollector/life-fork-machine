import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  FlaskConical,
  GitFork,
  Sparkles
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorldSignal } from "@/components/ui/world-signal";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-[90rem] px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <section className="grid items-center gap-10 xl:grid-cols-[1.02fr_0.98fr] xl:gap-16">
        <div className="stage-reveal">
          <div className="border-zhihu/25 bg-zhihu/10 mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-blue-200">
            <Sparkles aria-hidden="true" className="size-3.5" />
            知乎 AI 黑客松 · 跨次元游乐场
          </div>
          <h1 className="font-display max-w-4xl text-4xl leading-[1.08] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
            不是预测你会怎样，
            <span className="text-gradient">而是让你先活一次。</span>
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8">
            把同一个艰难决定送进三条平行人生。你会看见收益如何发生、代价由谁承担，以及哪一个关键假设最经不起现实。
          </p>

          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              {
                icon: BookOpenText,
                title: "真实经验",
                text: "8 条知乎社区样本"
              },
              { icon: GitFork, title: "三条人生", text: "同时间交叉回声" },
              { icon: FlaskConical, title: "现实实验", text: "7 天可逆验证" }
            ].map((item, index) => (
              <div
                className={`surface-lift stage-reveal rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 stage-delay-${index + 1}`}
                key={item.title}
              >
                <item.icon
                  aria-hidden="true"
                  className="mb-3 size-4 text-blue-300"
                />
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel stage-reveal stage-delay-1 relative overflow-hidden rounded-[1.75rem] border border-white/10 p-5 sm:p-7">
          <div
            aria-hidden="true"
            className="bg-zhihu/20 absolute -top-24 -right-20 size-56 rounded-full blur-3xl"
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-[0.18em]">
                  本届唯一开放困境
                </p>
                <p className="mt-2 text-sm text-blue-200">
                  职业选择 / 共同风险 / 不可逆承诺
                </p>
              </div>
              <span className="border-signal-lime/25 bg-signal-lime/10 text-signal-lime rounded-full border px-2.5 py-1 text-[11px] font-medium">
                可推演
              </span>
            </div>

            <h2 className="mt-8 text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-3xl">
              年薪稳定但成长停滞，
              <br />
              要不要跟领导辞职创业？
            </h2>

            <div className="mt-6 flex items-center gap-3" aria-hidden="true">
              <span className="bg-world-stay h-px flex-1 opacity-55" />
              <span className="border-zhihu/40 bg-zhihu/15 shadow-blue flex size-10 items-center justify-center rounded-full border text-[10px] font-semibold text-blue-100">
                IF
              </span>
              <span className="bg-world-leap h-px flex-1 opacity-55" />
              <span className="bg-world-bridge h-px flex-1 opacity-55" />
            </div>
            <p className="text-muted-foreground mt-2 text-center text-[10px] tracking-[0.12em] uppercase">
              同一问题 → 三条人生 → 一个现实实验
            </p>

            <div className="mt-8 space-y-3 rounded-2xl border border-white/[0.07] bg-black/15 p-4">
              <div className="scene-swap">
                <WorldSignal
                  color="stay"
                  label="留守轨道"
                  detail="留下，但不再把稳定当作默认答案"
                />
              </div>
              <div className="scene-swap stage-delay-1">
                <WorldSignal
                  color="leap"
                  label="全押新局"
                  detail="跳进去，但不把勇敢等同于闭眼"
                />
              </div>
              <div className="scene-swap stage-delay-2">
                <WorldSignal
                  color="bridge"
                  label="搭桥试水"
                  detail="先买信息，再决定是否买下整段人生"
                />
              </div>
            </div>

            <Button
              asChild
              className="shadow-blue mt-6 h-12 w-full rounded-xl text-base"
              size="lg"
            >
              <Link href="/calibrate">
                启动人生实验
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              className="mt-3 h-11 w-full rounded-xl"
              variant="outline"
            >
              <Link href="/demo">
                直接进入 90 秒演示
                <GitFork aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              className="mt-3 h-11 w-full rounded-xl"
              variant="ghost"
            >
              <Link href="/topic-lab">
                尝试其他议题
                <Sparkles aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-muted-foreground mt-3 text-center text-[11px]">
              约 5–7 分钟 · 无需登录 · 可随时退出
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
