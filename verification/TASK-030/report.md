# TASK-030 验证报告

- 日期：2026-09-08
- 结果：PASS
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
- [x] 有效凭据：20 次真实调用中结构化候选成功率 ≥ 95%。
- [x] 已检查候选响应不含 API Key；网关事件结构不包含题目原文或 IP 原文。

### 当前真实环境探针

- `.env.local` 已确认存在于仓库根目录；健康检查返回 `realtime-ready`、`provider: deepseek-responses`，但不显示密钥或模型全文。
- `api.deepseek.com:443` TCP 可达；真实请求已到达 Provider，说明此前的 OpenAI 出站网络问题已被替换为可用的 DeepSeek 通路。
- 已将网关改为 DeepSeek 官方支持的 Responses API 基础地址，并使用由 Zod 合同导出的 JSON Schema 请求结构化输出；模型密钥未出现在健康检查或候选响应中。
- DeepSeek 思考模式会把推理文本与候选文本混在一次响应中，造成偶发 JSON 失败。网关现显式关闭思考模式、使用低随机性请求，并在严格合同校验前只提取一个完整 JSON 对象；不会接受多对象、字段外写入或未经允许的来源。

### 20 次真实调用验收

- 输入：20 个带唯一运行标识的合成测试议题；每次均有 3 条审核测试来源，因此不会因缓存掩盖 Provider 调用。
- 结果：`20/20` 返回 `ai-generated-candidate`，成功率 `100%`，达到 `≥ 95%` 阈值。
- 失败：`0`；候选审核状态均为 `needs-evidence-review`，没有直接进入游戏会话或发布流程。
- 泄露检测：候选响应中未检测到 API Key 格式；汇总脚本不保存候选正文、原问题、调用方 IP 或密钥。
- 复验脚本：`scripts/verify-ai-gateway.ps1`、`scripts/stress-verify-ai-gateway.ps1`。生成的本地 JSON/TXT 结果被忽略，只将上述汇总保存在版本库。

## 已知边界与后续任务

- 自动测试以模拟 Provider 覆盖成功、缓存、超时、结构错误和无凭据状态；不需要也不会使用真实密钥。
- TASK-030 的本地真实调用验收已通过；生产部署环境仍应独立运行同一汇总脚本并保留自身的无敏感统计。
- `/topic-lab` 仍使用演示缓存；TASK-031 才将可编辑议题简报接入网关。

## 证据

- 相关文件：`src/server/ai/gateway.ts`、`src/app/api/ai/candidate/route.ts`、`tests/ai-gateway.test.ts`、`docs/AI-GATEWAY.md`
