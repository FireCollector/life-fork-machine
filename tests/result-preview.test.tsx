import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResultPreview } from "../src/components/experience/result-preview";
import {
  applyAction,
  applyAssumptionBlast,
  advanceExperiment,
  createSession,
  DEMO_SESSION_ID,
  demoContent,
  saveSession,
  selectWorld,
  startExperiment,
  type CalibrationAnswers
} from "../src/features/game";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

const NOW = "2026-09-01T10:00:00.000Z";
const calibration: CalibrationAnswers = {
  runway: "12-24",
  sharedRisk: "partner",
  primaryFear: "financial-loss",
  primaryGoal: "autonomy",
  uncertaintyStyle: "validate-first"
};

function renderResult(sessionId: string) {
  return render(
    <ResultPreview
      outcomes={demoContent.outcomes}
      scenario={demoContent.scenario}
      sessionId={sessionId}
      sourceCards={demoContent.sourceCards}
    />
  );
}

describe("D06 result cost map", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });
  });

  it("renders the full cost map and copies a grounded text result", async () => {
    let session = selectWorld(
      createSession(calibration, demoContent.scenario, {
        id: DEMO_SESSION_ID,
        seed: 23,
        now: NOW
      }),
      demoContent.scenario,
      "bridge",
      NOW
    );
    session = applyAction(
      session,
      demoContent.scenario,
      "bridge-1-evidence-sprint",
      NOW
    ).session;
    session = applyAction(
      session,
      demoContent.scenario,
      "bridge-2-conditional-join",
      NOW
    ).session;
    session = applyAssumptionBlast(
      session,
      demoContent.outcomes,
      "equity-promise-breaks",
      NOW
    ).session;
    session = applyAction(
      session,
      demoContent.scenario,
      "bridge-3-validated-join",
      NOW
    ).session;
    saveSession(window.localStorage, session);

    renderResult(DEMO_SESSION_ID);

    expect(
      screen.getByRole("heading", { name: "搭桥试水的代价地图。" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /留守轨道、全押新局、搭桥试水的六维代价雷达对比/
      })
    ).toBeInTheDocument();
    expect(screen.getByText("已走路径 · 真实行动账本")).toBeInTheDocument();
    expect(screen.getAllByText("未走路径 · 冻结情景剖面")).toHaveLength(2);
    expect(screen.getByText("得到")).toBeInTheDocument();
    expect(screen.getByText("失去")).toBeInTheDocument();
    expect(screen.getByText("仍不知道")).toBeInTheDocument();
    expect(
      screen.getByText("发现想错了：领导真会把股权给你")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "这条路径最容易忽略的地方" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "一年后的你写来一封信" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("虚构反思文本，不是对现实未来的预测")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "七天家庭承受力核验" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("家里能不能扛住一年少收入和更多加班？")
    ).toBeInTheDocument();
    expect(
      screen.getByText("先把账和时间算清，别等压力爆了才谈。")
    ).toBeInTheDocument();
    expect(
      screen.getByText("算出最低月支出、收入缺口和每周最多能投入多少时间。")
    ).toBeInTheDocument();
    expect(
      screen.getByText("预算和边界都扛得住，可以继续试。")
    ).toBeInTheDocument();
    expect(
      screen.getByText("一降收入就会影响生活，先暂停或补收入。")
    ).toBeInTheDocument();
    expect(
      screen.getByText("账还没算全，不要把家庭支持当成确定条件。")
    ).toBeInTheDocument();
    expect(screen.getByText("退出规则")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "开始演示七天模拟" }));
    await waitFor(() =>
      expect(screen.getByText("已推进 0 / 7 天")).toBeInTheDocument()
    );
    for (let day = 1; day <= 7; day += 1) {
      fireEvent.click(
        screen.getByRole("button", { name: `推进到第 ${day} 天` })
      );
      await waitFor(() =>
        expect(screen.getByText(`已推进 ${day} / 7 天`)).toBeInTheDocument()
      );
    }
    expect(
      screen.getByRole("button", { name: "证据支持" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "证据冲突" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "暂时不清楚" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "证据冲突" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "已记录演示反馈：证据冲突"
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "下一步建议：先补现金储备或缩小试水范围，不急着离职。"
    );
    expect(
      screen.getAllByRole("link", { name: "查看原文" }).length
    ).toBeGreaterThanOrEqual(3);

    fireEvent.click(screen.getByRole("button", { name: "复制文本结果" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText.mock.calls[0][0]).toContain(
      "《人生分岔机》代价地图｜搭桥试水"
    );
    expect(writeText.mock.calls[0][0]).toContain("7 天现实实验");
    expect(writeText.mock.calls[0][0]).toContain(
      "家里能不能扛住一年少收入和更多加班？"
    );
    expect(writeText.mock.calls[0][0]).toContain(
      "什么算证据：算出最低月支出、收入缺口和每周最多能投入多少时间。"
    );
    expect(writeText.mock.calls[0][0]).toContain("演示反馈：证据冲突");
    expect(
      screen.getByRole("button", { name: "已复制文本结果" })
    ).toBeInTheDocument();
  });

  it("does not invent a result for an unfinished session", () => {
    renderResult("unfinished-session");

    expect(
      screen.getByRole("heading", { name: "这条人生还没有走到结尾。" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回继续推演" })).toHaveAttribute(
      "href",
      "/play/unfinished-session"
    );
  });

  it("shows the reason for a real-experiment adjustment and lets the user undo it", async () => {
    const sessionId = "adaptive-real-session";
    const now = new Date().toISOString();
    let session = selectWorld(
      createSession(calibration, demoContent.scenario, {
        id: sessionId,
        seed: 29,
        now
      }),
      demoContent.scenario,
      "bridge",
      now
    );
    session = applyAction(
      session,
      demoContent.scenario,
      "bridge-1-evidence-sprint",
      now
    ).session;
    session = applyAction(
      session,
      demoContent.scenario,
      "bridge-2-conditional-join",
      now
    ).session;
    session = applyAssumptionBlast(
      session,
      demoContent.outcomes,
      "equity-promise-breaks",
      now
    ).session;
    session = applyAction(
      session,
      demoContent.scenario,
      "bridge-3-validated-join",
      now
    ).session;
    session = startExperiment(
      session,
      demoContent.outcomes,
      "test-family-stress",
      now,
      { mode: "real" }
    );
    session = advanceExperiment(
      session,
      demoContent.outcomes,
      "test-family-stress",
      now,
      {
        choice: "请对方补一份现金流说明",
        note: "对方没有回复。",
        evidenceType: "conversation",
        evidenceSignal: "insufficient",
        blocker: "no_response",
        feeling: "steady"
      }
    ).session;
    saveSession(window.localStorage, session);

    renderResult(sessionId);

    expect(await screen.findByText("给第 2 天的调整建议")).toBeInTheDocument();
    expect(screen.getByText(/信息暂时缺失/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "采用建议" }));
    await waitFor(() =>
      expect(screen.getByText(/已写入下一步：/)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: "撤销调整" }));
    await waitFor(() =>
      expect(screen.getByText(/你选择保留原计划/)).toBeInTheDocument()
    );
  });
});
