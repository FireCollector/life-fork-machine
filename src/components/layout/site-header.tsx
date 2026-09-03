"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesCombined,
  FlaskConical,
  GitBranch,
  Home,
  RefreshCcw,
  ScanSearch
} from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  {
    href: "/",
    label: "困境",
    icon: Home,
    matches: (path: string) => path === "/"
  },
  {
    href: "/calibrate",
    label: "校准",
    icon: FlaskConical,
    matches: (path: string) => path.startsWith("/calibrate")
  },
  {
    href: "/forge",
    label: "熔炉",
    icon: ScanSearch,
    matches: (path: string) => path.startsWith("/forge")
  },
  {
    href: "/play/demo",
    label: "推演",
    icon: GitBranch,
    matches: (path: string) => path.startsWith("/play")
  },
  {
    href: "/result/demo",
    label: "报告",
    icon: ChartNoAxesCombined,
    matches: (path: string) => path.startsWith("/result")
  }
];

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return navigation.map((item) => {
    const active = item.matches(pathname);
    const Icon = item.icon;

    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex items-center justify-center gap-2 rounded-full text-sm transition-colors",
          mobile
            ? "min-h-12 flex-1 flex-col gap-0.5 px-1 text-[11px]"
            : "px-3.5 py-2",
          active
            ? "bg-white/10 text-white"
            : "text-muted-foreground hover:bg-white/[0.05] hover:text-white"
        )}
        href={item.href}
        key={item.href}
      >
        <Icon
          aria-hidden="true"
          className={cn(mobile ? "size-4" : "size-3.5")}
        />
        {item.label}
        {active ? (
          <span
            aria-hidden="true"
            className="bg-zhihu absolute -bottom-px h-0.5 w-5 rounded-full"
          />
        ) : null}
      </Link>
    );
  });
}

export function SiteHeader() {
  return (
    <>
      <header className="bg-night/80 sticky top-0 z-50 border-b border-white/[0.07] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link className="group flex min-w-0 items-center gap-2.5" href="/">
            <BrandMark className="size-8 transition-transform group-hover:-rotate-3" />
            <span className="truncate text-sm font-semibold tracking-wide sm:text-base">
              人生分岔机
            </span>
            <span className="text-muted-foreground hidden rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium tracking-[0.12em] sm:inline-flex">
              LIFE FORK / 01
            </span>
          </Link>

          <nav
            aria-label="主导航"
            className="mx-auto hidden items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.025] p-1 lg:flex"
          >
            <NavigationLinks />
          </nav>

          <Button asChild className="ml-auto" size="sm" variant="outline">
            <Link href="/">
              <RefreshCcw aria-hidden="true" />
              <span className="hidden sm:inline">重新开始</span>
              <span className="sr-only sm:hidden">重新开始</span>
            </Link>
          </Button>
        </div>
      </header>

      <nav
        aria-label="移动端主导航"
        className="bg-night-raised/95 shadow-panel fixed inset-x-3 bottom-3 z-50 flex rounded-2xl border border-white/10 p-1 backdrop-blur-xl lg:hidden"
      >
        <NavigationLinks mobile />
      </nav>
    </>
  );
}
