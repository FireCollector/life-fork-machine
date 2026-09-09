import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DecisionArchive } from "../src/components/experience/decision-archive";
import {
  createSession,
  demoContent,
  saveSession,
  selectWorld,
  type CalibrationAnswers
} from "../src/features/game";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push })
}));

const calibration: CalibrationAnswers = {
  runway: "12-24",
  sharedRisk: "self",
  primaryFear: "financial-loss",
  primaryGoal: "growth",
  uncertaintyStyle: "validate-first"
};

function saveCompletedDecision() {
  let session = selectWorld(
    createSession(calibration, demoContent.scenario, {
      id: "archive-ui-session",
      now: "2026-09-01T09:00:00.000Z"
    }),
    demoContent.scenario,
    "bridge",
    "2026-09-01T09:00:00.000Z"
  );
  session = {
    ...session,
    status: "completed" as const,
    actionHistory: [
      "bridge-1-evidence-sprint",
      "bridge-2-conditional-join",
      "bridge-3-validated-join"
    ],
    ledger: {
      ...session.ledger,
      costs: ["担心现金流会先断掉"]
    }
  };
  saveSession(window.localStorage, session);
}

describe("TASK-040 decision archive experience", () => {
  beforeEach(() => {
    window.localStorage.clear();
    push.mockReset();
  });

  it("schedules and writes a review, then opens an immutable new-information branch", async () => {
    saveCompletedDecision();
    render(<DecisionArchive />);

    expect(
      await screen.findByText("高薪留守，还是跟领导创业？")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ 7 天后" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("已保存7 天后复盘")
    );
    fireEvent.click(screen.getByRole("button", { name: "现在复盘" }));
    fireEvent.change(screen.getByLabelText("后来真正发生了什么？"), {
      target: { value: "领导补充了书面预算。" }
    });
    fireEvent.change(
      screen.getByLabelText("它和当时最担心的事，有什么不同？"),
      { target: { value: "现金流没有立刻断，但付款时间仍需确认。" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "保存复盘" }));
    await waitFor(() =>
      expect(
        screen.getByText("后来发生：领导补充了书面预算。")
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "用新信息创建分支" }));
    fireEvent.change(
      screen.getByPlaceholderText(
        "例如：客户确认下月会签约，但付款周期是 60 天"
      ),
      { target: { value: "客户确认会签约，但付款在两个月后。" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "创建分支" }));
    await waitFor(() => expect(push).toHaveBeenCalledOnce());
    expect(push.mock.calls[0][0]).toMatch(
      /^\/result\/archive-ui-session-branch-/
    );
    expect(window.localStorage.length).toBe(2);
  });
});
