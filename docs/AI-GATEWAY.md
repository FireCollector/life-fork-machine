# 服务端 AI Provider 网关

维护任务：TASK-030  
状态：实现完成，等待有效凭据进行 20 次真实调用验收

## 这层解决什么

`src/server/ai/gateway.ts` 是模型调用唯一入口。浏览器只会请求 `POST /api/ai/candidate`；`AI_API_KEY` 只在 Node.js 服务端读取，不会进入浏览器包、健康检查或运行日志。

当前提供 OpenAI Responses 兼容实现。它将一个 `AiGenerationRequest` 发送给配置的端点，要求 JSON 对象输出，再用 TASK-029 的 Zod 合同、来源白名单和人工审核状态校验结果。Provider 可在后续通过相同网关接口替换，不需要让页面直接接触密钥或模型响应。

实现参考 [OpenAI Structured Outputs 指南](https://platform.openai.com/docs/guides/structured-outputs) 与 [Responses API 文档](https://platform.openai.com/docs/api-reference/responses)。本机访问官方页面时受到网络侧 Cloudflare 限制；实际接入仍以官方最新文档和账户可用模型为准。

## 本地配置

1. 复制 `.env.example` 为未提交的 `.env.local`。
2. 只在 `.env.local` 写入下列值；不要使用 `NEXT_PUBLIC_` 前缀，也不要贴到聊天、提交或截图里。

```dotenv
AI_PROVIDER=openai
AI_API_KEY=你的服务端密钥
AI_MODEL=你账户可用的模型标识
```

3. 重启 `npm run dev`，访问 `/api/health`。
4. 当 `ai.mode` 是 `realtime-ready` 时，网关可以接受请求；是 `demo-cache` 时，应用会保留确定性 Demo，不发送 Provider 请求。

可选参数见 `.env.example`：超时 15 秒、最多 1 次重试、每调用方每分钟 10 次、缓存 5 分钟且最多 100 条。`AI_BASE_URL` 默认为 OpenAI Responses 端点，仅用于服务端。

## API

### `POST /api/ai/candidate`

请求体必须是 TASK-029 的 `AiGenerationRequest`：包含一个问题、已确认约束和 3–12 条已审核来源。路由拒绝大于 128 KB、无效 JSON 和不合约的请求，且将调用方地址仅以 SHA-256 哈希形式用于内存限流。

响应是下列之一：

- `AiCandidateBundle`：`provenance: "ai-generated-candidate"`，只能进入审核；
- `AiFailure`：带可显示的错误、是否可重试和可用 fallback。

HTTP 状态：429 为本地或 Provider 限流，503 为未配置/不可用 Provider，504 为超时，422 为敏感议题或拒答。没有凭据时，返回透明的 `provider-unavailable`，不会以模板内容冒充实时 AI。

## 请求的真实流向

```text
浏览器
  → /api/ai/candidate（Node.js）
  → AiGenerationRequest Zod 校验
  → 敏感议题检查、限流、SHA-256 缓存
  → Provider Responses 请求（仅服务端附加 Authorization）
  → JSON 解析 + AiCandidateBundle Zod + 来源白名单
  → 覆写 provider/model/time 元数据
  → 待审核候选或 AiFailure
```

模型返回的 metadata 不被信任：网关使用真实配置的 provider、model、服务端生成时间和 prompt 版本覆写它。模型也不能在候选中写入 `GameSession`、`StateDelta`、发布决定或实验完成状态。

## 无敏感原文的运行日志

每次调用只记录：

- `requestId`、耗时、Provider、模型、Prompt 版本；
- 尝试次数、是否命中缓存、成功/失败类型；
- Provider 返回的输入、输出和总 Token 用量（可用时）。

日志**不记录**用户问题、已确认约束、来源正文、Authorization、API Key、IP 原文或完整 Provider 响应。缓存键和调用方限流键均为哈希；缓存内容只保存在进程内存，不落盘。

## 失败、重试与取消

- 网络错误和 5xx：最多重试一次；
- 超时：15 秒后终止请求，返回 `timeout`；
- 浏览器取消：中止服务端 fetch，返回 `cancelled`；
- 结构错误、未知来源引用：返回 `invalid-output`，不缓存；
- 429：返回 `rate-limited`，不做盲目重试；
- 无凭据、敏感议题和拒答：不请求或不保存候选，走既定降级路径。

成功候选才进入内存缓存；相同请求在 TTL 内不重复消耗 Token。当前 `/topic-lab` 明确显示“演示缓存”，它尚未调用本接口；TASK-031 会将用户问题先整理为可编辑简报，之后再接入本网关。

## 真实凭据验收脚本

由于仓库不保存凭据，CI 无法替代这一项。配置有效 `.env.local` 后，以已审核的 3–12 条测试来源连续调用 20 次，记录：

- 结构化候选成功次数（目标 ≥ 19/20）；
- `invalid-output`、超时、429 与 Provider 失败次数；
- 缓存命中是否没有额外 Provider 调用；
- 事件日志中是否不存在题目原文、Key 和 IP 原文；
- 禁用 `AI_API_KEY` 后，`/api/health` 是否回到 `demo-cache`，并且固定 Demo 仍可完成。

把仅含汇总数字的结果补充到 `verification/TASK-030/report.md`，不要提交请求正文或凭据。

## 连通性排障

如果健康检查已经是 `realtime-ready`，但候选接口持续返回 `provider-unavailable` 且诊断为 `provider request failed: TypeError`，说明请求没有得到 Provider 的 HTTP 响应。先在运行 Next.js 的机器上确认对 `api.openai.com:443` 的 HTTPS 出站连接；DNS 能解析但 TCP 连接失败通常是网络、防火墙或代理策略问题，不是 Zod Schema 或模型输出问题。

请在合法合规的网络出口、组织批准的代理/网关或已允许出站访问的部署环境中运行服务。不要通过把 Key 放到浏览器、源码、公共代理或 GitHub Issue 来绕过此限制；网络恢复后再从“真实凭据验收脚本”重新开始统计 20 次调用。
