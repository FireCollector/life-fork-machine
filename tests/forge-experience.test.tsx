import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForgeExperience } from "../src/components/experience/forge-experience";
import {
  SESSION_STORAGE_PREFIX,
  demoContent,
  saveCalibration,
  type CalibrationAnswers
} from "../src/features/game";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push })
}));

const calibration: CalibrationAnswers = {
  runway: "6-12",
  sharedRisk: "self",
  primaryFear: "growth-stagnation",
  primaryGoal: "growth",
  uncertaintyStyle: "validate-first"
};

describe("D03 evidence forge", () => {
  beforeEach(() => {
    push.mockReset();
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  it("reveals all reviewed evidence and creates the selected local world", () => {
    saveCalibration(window.localStorage, calibration);
    render(
      <ForgeExperience
        evidenceRetrievedAt={demoContent.evidenceRetrievedAt}
        scenario={demoContent.scenario}
        sourceCards={demoContent.sourceCards}
      />
    );

    act(() => vi.runAllTimers());
    expect(screen.getByText("编译完成")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /查看原文/ })).toHaveLength(8);
    expect(
      screen.getByRole("heading", { name: "留守轨道" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "全押新局" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "搭桥试水" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /进入搭桥试水/ }));
    const destination = push.mock.calls[0]?.[0] as string;
    const sessionId = destination.replace("/play/", "");
    const stored = window.localStorage.getItem(
      `${SESSION_STORAGE_PREFIX}${sessionId}`
    );

    expect(destination).toMatch(/^\/play\/[0-9a-f-]+$/);
    expect(stored).toContain('"selectedWorld":"bridge"');
  });
});
