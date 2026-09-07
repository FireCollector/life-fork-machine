# TASK-030｜建立服务端 AI Provider 网关

- 状态：Verification
- 负责人：项目负责人 + Codex
- 创建日期：2026-09-07
- 依赖任务：TASK-029 Done

## 目标

让应用具备安全、可替换、可观测的真实模型调用入口：凭据仅服务端可见，结果必须通过 AI 合同和来源校验，失败时明确回到演示缓存。

## 为什么现在做

TASK-029 已冻结“AI 只生成待审核候选”的边界。没有一个统一网关，后续议题理解、证据整理和叙事生成会各自处理密钥、失败和输出，难以审计也容易绕过边界。

## 输入与输出

- 输入：`AiGenerationRequest`、TASK-029 合同、服务端环境变量。
- 输出：`POST /api/ai/candidate`、网关接口、进程内缓存/限流、无敏感原文的事件日志和透明 `AiFailure`。

## 范围

- 允许修改：`src/server/ai/**`、`src/app/api/ai/**`、`src/features/ai/**`、健康检查、`/topic-lab` 模式文案、测试、AI 文档、环境模板、任务与验证文档。
- 不允许修改：把密钥提交到仓库、直接从浏览器调用 Provider、自动发布 `ScenarioPack`、修改确定性规则引擎。
- 本任务不做：将真实 AI 接入议题页面、获取知乎内容、完成任意议题的完整推演。

## 工作清单

- [x] 建立服务端 OpenAI Responses 兼容网关，密钥不进入客户端。
- [x] 支持 JSON 对象响应、Zod/来源校验、15 秒超时、一次有限重试和取消请求。
- [x] 记录无敏感原文的事件；提供 request ID、耗时、模型、Prompt 版本、Token 用量和失败类型。
- [x] 加入 SHA-256 缓存、调用方哈希限流和缓存大小上限。
- [x] 提供透明 `demo-cache` / `realtime-ready` 状态和无凭据降级。
- [x] 覆盖成功、缓存、超时、结构错误与未配置 Provider 的自动测试。
- [ ] 使用有效凭据连续调用 20 次并记录真实成功率（等待项目负责人本地凭据）。

## 验收标准

- [x] Given 未配置凭据，When 请求候选，Then 不发送 Provider 调用并返回确定性 Demo 降级。
- [x] Given Provider 返回有效候选，When 网关解析，Then 服务器覆写 model metadata，并验证所有来源。
- [x] Given 超时或结构错误，When Provider 失败，Then 不写入缓存、会话或正式内容。
- [x] Given 相同请求，When TTL 内再次提交，Then 不重复调用 Provider。
- [ ] Given 有效凭据，When 连续调用 20 次，Then 结构化成功率不少于 95%。

## 验证

- 自动检查：lint、typecheck、Vitest、build、`git diff --check`。
- 手工检查：`/api/health` 无凭据显示 `demo-cache`；配置后进行 20 次汇总测试。
- 证据目录：`verification/TASK-030/`。

## 回滚与阻塞

- 回滚方式：删除新增网关和路由不会影响固定 Demo。
- 当前阻塞：没有用户的有效服务端 Provider 凭据，无法完成 20 次真实调用阈值。
- 解除条件：用户在未提交的 `.env.local` 中配置凭据，并按 `docs/AI-GATEWAY.md` 的汇总流程执行验证。

## 需要同步的文档

- [x] 任务板
- [x] README
- [x] 架构或网关文档
- [x] 验证报告（真实凭据验收待补充）
