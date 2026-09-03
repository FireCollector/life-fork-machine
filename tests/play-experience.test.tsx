import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlayExperience } from "../src/components/experience/play-experience";
import {
  createSession,
  demoContent,
  loadSession,
  saveSession,
  selectWorld,
  type CalibrationAnswers
} from "../src/features/game";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push })
}));

const calibration: CalibrationAnswers = {
  runway: "6-12",
  sharedRisk: "partner",
  primaryFear: "financial-loss",
  primaryGoal: "autonomy",
  uncertaintyStyle: "validate-first"
};

function createBridgeSession() {
  const session = selectWorld(
    createSession(calibration, demoContent.scenario, {
      id: "play-test-session",
      seed: 11,
      now: "2026-09-01T10:00:00.000Z"
    }),
    demoContent.scenario,
    "bridge",
    "2026-09-01T10:00:00.000Z"
  );
  saveSession(window.localStorage, session);
  return session;
}

function renderPlay(sessionId = "play-test-session") {
  return render(
    <PlayExperience
      outcomes={demoContent.outcomes}
      scenario={demoContent.scenario}
      sessionId={sessionId}
      sourceCards={demoContent.sourceCards}
    />
  );
}

describe("D04 playable three-act experience", () => {
  beforeEach(() => {
    push.mockReset();
    window.localStorage.clear();
  });

  it("recovers after reload and completes action → blast → result", () => {
    createBridgeSession();
    const firstRender = renderPlay();

    expect(
      screen.getByRole("button", { name: /把四周要查的事写下来/ })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "查看原文" })).toHaveLength(2);
    fireEvent.click(
      screen.getByRole("button", { name: /把四周要查的事写下来/ })
    );
    expect(screen.getByText(/你把口头邀请写成了一张清单/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "如果选了另外两条路呢？"
      })
    ).toBeInTheDocument();
    expect(screen.getByText("另一边的你已经说不去了")).toBeInTheDocument();
    expect(screen.getByText("另一边的你已经辞职")).toBeInTheDocument();
    expect(screen.getByText("为什么会变")).toBeInTheDocument();
    expect(screen.getByText("状态变化")).toBeInTheDocument();
    expect(loadSession(window.localStorage, "play-test-session")?.act).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "直接下一步" }));

    firstRender.unmount();
    renderPlay();
    expect(
      screen.getByRole("heading", { name: "有一笔付款，然后呢？" })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /条件谈妥，再正式加入/ })
    );
    fireEvent.click(screen.getByRole("button", { name: "进入第 3 幕" }));
    expect(
      screen.getByRole("heading", { name: "你最相信的事，先查一查" })
    ).toBeInTheDocument();

    const animationControl = screen.getByRole("button", {
      name: "直接显示"
    });
    fireEvent.click(animationControl);
    expect(animationControl).toHaveAttribute("aria-pressed", "true");
    expect(animationControl).toHaveTextContent("已直接显示");

    fireEvent.click(screen.getByRole("button", { name: /领导真会把股权给你/ }));
    expect(
      screen.getByText("先看合同：股权和职位真的写进去了吗？")
    ).toBeInTheDocument();
    expect(screen.getByText("合同写清了")).toBeInTheDocument();
    expect(screen.getByText("只有口头承诺")).toBeInTheDocument();
    expect(screen.getByText("合同里没有")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /合同里没有/ }));
    expect(
      screen.getByRole("heading", { level: 2, name: "事情和想的不一样" })
    ).toBeInTheDocument();
    expect(screen.getByText("你原来以为")).toBeInTheDocument();
    expect(screen.getByText("这次查到")).toBeInTheDocument();
    expect(screen.getByText("接下来会怎样")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /继续下一步/ }));

    fireEvent.click(
      screen.getByRole("button", { name: /条件都过关，正式加入/ })
    );
    expect(
      screen.getByRole("button", { name: /生成代价报告/ })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /生成代价报告/ }));

    const completed = loadSession(window.localStorage, "play-test-session");
    expect(completed).toMatchObject({
      status: "completed",
      selectedWorld: "bridge",
      blastedAssumptionId: "equity-promise-breaks"
    });
    expect(completed?.assumptionResult).toBe("contradicted");
    expect(completed?.assumptionEvidenceId).toBe("equity-missing");
    expect(completed?.actionHistory).toHaveLength(3);
    expect(push).toHaveBeenCalledWith("/result/play-test-session");
  });

  it("does not fabricate a session when a local save is missing", () => {
    renderPlay("missing-session");

    expect(
      screen.getByRole("heading", { name: "这条世界线还没有被创建。" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回证据熔炉" })).toHaveAttribute(
      "href",
      "/forge"
    );
  });
});
