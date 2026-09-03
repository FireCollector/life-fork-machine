"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PageError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[64vh] w-full max-w-[90rem] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <section
        className="glass-panel stage-reveal border-destructive/25 relative w-full max-w-lg overflow-hidden rounded-3xl border p-7 text-center sm:p-9"
        role="alert"
      >
        <span
          aria-hidden="true"
          className="bg-destructive/30 absolute top-8 left-[-12%] h-px w-[46%] -rotate-6"
        />
        <span
          aria-hidden="true"
          className="bg-destructive/30 absolute top-10 right-[-12%] h-px w-[46%] rotate-6"
        />
        <AlertTriangle
          aria-hidden="true"
          className="mx-auto size-8 text-orange-300"
        />
        <h1 className="mt-5 text-xl font-semibold">这条世界线暂时断开了</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          你的选择尚未被改写。可以重试当前页面，或返回困境入口重新开始。
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>
            <RotateCcw aria-hidden="true" />
            重试当前页面
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft aria-hidden="true" />
              返回入口
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
