import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BranchEchoStage } from "../src/components/experience/fork-memory-stages";
import { demoContent } from "../src/features/game";

describe("D05 branch echo stage", () => {
  it("renders exactly the other two worlds for every frozen scene", () => {
    for (const world of demoContent.scenario.worlds) {
      for (const scene of world.acts) {
        const view = render(
          <BranchEchoStage
            currentWorld={world}
            nextLabel="继续"
            onContinue={vi.fn()}
            scene={scene}
            sourceCards={demoContent.sourceCards}
            worlds={demoContent.scenario.worlds}
          />
        );
        const stage = screen.getByRole("region", {
          name: "如果选了另外两条路呢？"
        });

        expect(within(stage).getAllByRole("article")).toHaveLength(2);
        expect(
          within(stage).queryByText(`未选择 · ${world.name}`)
        ).not.toBeInTheDocument();
        expect(
          within(stage).getByRole("button", { name: "直接下一步" })
        ).toBeInTheDocument();
        view.unmount();
      }
    }
  });
});
