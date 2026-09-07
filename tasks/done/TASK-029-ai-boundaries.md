# TASK-029｜定义 AI 与规则引擎的职责边界

- 状态：Done
- 负责人：项目负责人 + Codex
- 创建日期：2026-09-07
- 依赖任务：TASK-027 Done；TASK-028 预研究输入完成，真人研究 Blocked

## 目标

在接入真实模型前，冻结一个能被代码验证的 AI 合同：AI 只能生成带来源的候选内容，规则引擎仍是唯一能改变会话、数值、进度和发布状态的层。

## 为什么现在做

TASK-028 的预研究材料提示用户可能把叙事、实验或图表误读为预测和推荐。先定义边界，能防止后续模型接入把“看起来聪明的文字”误当作产品事实或用户决定。

## 输入与输出

- 输入：`docs/research/TASK-029-INPUT.md`、当前 `GameSession`/`Scenario` Schema、审核门禁和产品边界。
- 输出：AI 输入/输出/失败 Zod Schema、来源白名单校验、架构文档、测试和降级表。

## 范围

- 允许修改：`src/features/ai/**`、`tests/ai-contracts.test.ts`、`docs/AI-ARCHITECTURE.md`、任务与验证文档、README/架构索引。
- 不允许修改：真实 Provider 调用、OAuth、界面体验、现有规则引擎行为、生产密钥。
- 本任务不做：调用 AI、发布自动生成场景、将代理研究写成真人结论。

## 合同与决定

- `AiGenerationRequest` 只传递已确认约束与 3–12 条已审核来源。
- `AiCandidateBundle` 只能是 `ai-generated-candidate`，必须带 model、时间、提示版本、来源引用、置信与不确定性。
- `AiFailure` 为 timeout、来源不足、结构错误、敏感议题等情况定义透明降级。
- `GameSession`、`StateVector`、`StateDelta`、审核决定和正式 `ScenarioPack` 不出现在 AI 输出合同中。

## 工作清单

- [x] 将 TASK-028 的 P0/P1 风险转成 AI 设计约束。
- [x] 定义 AI 请求、候选、失败和来源引用 Schema。
- [x] 增加来源白名单与额外状态字段拒绝测试。
- [x] 定义 AI / 规则 / 人工审核职责、失败与发布门禁。
- [x] 运行全部质量检查并完成验证报告。

## 验收标准

- [x] Given 一组已审核来源，When 解析 AI 候选，Then 所有引用必须在该来源集合中。
- [x] Given AI 返回状态修改字段，When 解析候选，Then Schema 拒绝它而不触及规则引擎。
- [x] Given AI 不可用或证据不足，When 返回失败，Then 用户可见降级路径且不会生成伪结果。
- [x] Given 删除 AI 候选层，Then 可明确指出失去“新议题与新证据的候选整理”，而固定 Demo 仍可运行。

## 验证

- 自动检查：lint、typecheck、Vitest、build、`git diff --check`。
- 浏览器检查：不适用，本任务没有新增界面或 Provider 调用。
- 证据目录：`verification/TASK-029/`。

## 回滚与阻塞

- 回滚方式：移除 `src/features/ai` 与文档，不会改变已有 Demo 会话或内容。
- 阻塞条件：没有完成 TASK-030 前，不能真的调用模型；没有真实研究前，不能把预研究优先级视为用户结论。
- 解除条件：TASK-030 实现服务端 Provider，并在真实会话到来后复核本合同的优先级与文案。

## 需要同步的文档

- [x] 任务板
- [x] README
- [x] 架构或合同文档
- [x] 验证报告
