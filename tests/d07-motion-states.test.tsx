import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { Sparkles } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { PageError } from "../src/components/experience/page-error";
import {
  EmptyState,
  PageLoading
} from "../src/components/experience/route-states";
import { UniverseRail } from "../src/components/experience/universe-rail";

describe("D07 demo polish and recovery states", () => {
  it("shows an accessible loading and empty experience", () => {
    const loading = render(<PageLoading label="正在恢复人生账本" />);

    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("正在恢复人生账本")).toBeInTheDocument();
    loading.unmount();

    render(
      <EmptyState
        description="没有找到对应的世界线。"
        icon={Sparkles}
        title="世界线不存在"
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent("世界线不存在");
  });

  it("offers a working retry action from the error boundary", () => {
    const reset = vi.fn();
    render(<PageError reset={reset} />);

    expect(screen.getByRole("alert")).toHaveTextContent("这条世界线暂时断开了");
    fireEvent.click(screen.getByRole("button", { name: "重试当前页面" }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("marks the active universe node and grows the rail by act", () => {
    const { container } = render(<UniverseRail activeWorld="bridge" act={2} />);

    expect(screen.getByLabelText("第 2 幕，当前")).toHaveClass(
      "rail-node-current"
    );
    expect(container.querySelectorAll(".rail-progress")).toHaveLength(3);
    expect(container.querySelector(".rail-progress")).toHaveStyle({
      width: "calc(50% - 0.5rem)"
    });
  });

  it("keeps explicit reduced-motion fallbacks for every reveal primitive", async () => {
    const css = await readFile(
      resolve(process.cwd(), "src/app/globals.css"),
      "utf8"
    );

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".radar-world-reveal");
    expect(css).toContain(".evidence-drawer__content");
    expect(css).toContain("animation-duration: 0.01ms !important");
  });
});
