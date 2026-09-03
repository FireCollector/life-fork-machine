import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CalibrationFlow } from "../src/components/experience/calibration-flow";
import { loadCalibration } from "../src/features/game";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push })
}));

describe("D03 calibration flow", () => {
  beforeEach(() => {
    push.mockReset();
    window.localStorage.clear();
  });

  it("supports backtracking and sends five validated answers to the forge", () => {
    render(<CalibrationFlow />);

    fireEvent.click(screen.getByRole("button", { name: /12–24 个月/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一题/ }));
    expect(
      screen.getByRole("heading", { name: /会由谁一起承担/ })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /上一题/ }));
    expect(screen.getByRole("button", { name: /12–24 个月/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: /下一题/ }));

    fireEvent.click(screen.getByRole("button", { name: /我和伴侣/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一题/ }));
    fireEvent.click(screen.getByRole("button", { name: /经济失控/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一题/ }));
    fireEvent.click(screen.getByRole("button", { name: /^自主权/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一题/ }));
    fireEvent.click(screen.getByRole("button", { name: /先验证关键假设/ }));

    expect(screen.getByText("约束校准结果")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /送入证据熔炉/ }));

    expect(loadCalibration(window.localStorage)).toMatchObject({
      runway: "12-24",
      sharedRisk: "partner",
      primaryFear: "financial-loss",
      primaryGoal: "autonomy",
      uncertaintyStyle: "validate-first"
    });
    expect(push).toHaveBeenCalledWith("/forge");
  });
});
