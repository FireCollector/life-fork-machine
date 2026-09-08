# TASK-030 验证报告

- 日期：2026-09-08
- 结果：PARTIAL
- 提交：`80c648f`（服务端网关与自动验证）
- 验证范围：服务端 Provider 隔离、输出校验、失败降级、缓存和限流

## 完成结果

服务端网关、`POST /api/ai/candidate`、内存缓存/限流、超时与取消映射已实现。Provider 输出必须经 JSON 解析、TASK-029 Zod 合同和来源白名单校验；未配置凭据时不发送外部请求，并返回透明的演示缓存降级。

## 自动检查

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`（17 files / 62 tests）
- [x] `npm run build`（包含 `/api/ai/candidate`）
- [x] `git diff --check`

## 手工验证

- [x] 无凭据：健康检查单测验证 `ai.mode: demo-cache`，且没有密钥字段。
- [ ] 有效凭据：20 次真实调用中结构化候选成功率 ≥ 95%。
- [ ] 已检查事件日志不含 API Key、题目原文或 IP 原文。

### 当前真实环境探针

- `.env.local` 已确认存在于仓库根目录；健康检查返回 `realtime-ready`、`provider: deepseek-responses`，但不显示密钥或模型全文。
- `api.deepseek.com:443` TCP 可达；真实请求已到达 Provider，说明此前的 OpenAI 出站网络问题已被替换为可用的 DeepSeek 通路。
- 已将网关改为 DeepSeek 官方支持的 Responses API 基础地址，并使用由 Zod 合同导出的 JSON Schema 请求结构化输出；模型密钥未出现在健康检查或候选响应中。
- 当前一条完整候选探针超过原 15 秒网关等待上限，返回透明 `timeout`；本机 `.env.local` 已将等待上限调至 60 秒以继续观察。受本次命令执行窗口限制，尚未得到可统计的完整响应，因此**不能**计入 20 次成功率样本。

## 已知边界与后续任务

- 自动测试以模拟 Provider 覆盖成功、缓存、超时、结构错误和无凭据状态；不需要也不会使用真实密钥。
- DeepSeek 已具备有效服务端配置和网络通路；仍需在可持续运行的本地或部署环境中完成 20 次真实调用汇总，在完成前任务维持 Verification。
- `/topic-lab` 仍使用演示缓存；TASK-031 才将可编辑议题简报接入网关。

## 证据

- 相关文件：`src/server/ai/gateway.ts`、`src/app/api/ai/candidate/route.ts`、`tests/ai-gateway.test.ts`、`docs/AI-GATEWAY.md`
