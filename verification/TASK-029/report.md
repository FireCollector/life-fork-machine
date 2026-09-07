# TASK-029 验证报告

- 日期：2026-09-07
- 结果：PASS
- 提交：`f13335e`（AI 合同与架构）
- 验证范围：AI 合同、来源引用、规则隔离和失败降级

## 完成结果

AI 合同现可在运行时校验：候选必须带来源、模型元数据、置信与不确定性，并且只能进入审核状态。未知来源 ID 与任何直接状态修改字段都会被拒绝。失败被显式编码为 `AiFailure`，不会写入会话。

## 自动检查

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`（16 files / 56 tests）
- [x] `npm run build`
- [x] `git diff --check`

## 人工体验

- 桌面端：本任务未修改界面。
- 移动端：本任务未修改界面。
- 失败与降级：由 `AiFailure` 合同定义，Provider 接入留给 TASK-030。
- 刷新与恢复：本任务不写入浏览器会话。

## 验收条件结果

- [x] 已审核来源集合外的引用会被拒绝。
- [x] 额外的状态修改字段会被严格 Schema 拒绝，候选合同不依赖或修改规则引擎。
- [x] timeout、来源不足、结构错误、敏感议题等失败状态有透明 fallback。
- [x] 去掉 `src/features/ai` 后，固定 Demo 和确定性规则仍可运行；失去的是新议题与新证据的候选整理能力。

## 已知边界与后续任务

- 本任务只冻结合同，不包含真实模型调用。
- TASK-028 的真人研究仍被阻塞；其结论将用于复核 AI 职责优先级。

## 证据

- 自动检查日志：2026-09-07 本地执行，全部通过；首次沙箱执行 Vite/Next 时因 `spawn EPERM` 受限，受控重跑后通过。
- 相关文件：`src/features/ai/contracts.ts`、`tests/ai-contracts.test.ts`、`docs/AI-ARCHITECTURE.md`
