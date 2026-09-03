# S04 Next.js 工程重建验收记录

## 结论

S04 已完成。原生 Node 静态 Hello World 已替换为可运行、可测试、可生产构建的 Next.js App Router 工程，同时保留知乎官方 Skill、无 OAuth 配置和系统钥匙串中的 Access Secret。

## 技术基线

| 项目               | 版本 / 状态                                       |
| ------------------ | ------------------------------------------------- |
| Node.js            | 24.15.0                                           |
| npm                | 11.12.1                                           |
| Next.js            | 16.3.4，App Router + Turbopack                    |
| React / React DOM  | 19.2.8                                            |
| TypeScript         | 6.0.3，strict                                     |
| Tailwind CSS       | 4.3.3                                             |
| shadcn/ui          | `components.json` + New York 风格 + CSS variables |
| Radix              | `@radix-ui/react-slot` 1.3.3                      |
| 状态 / 校验 / 图表 | Zustand 5.0.15 / Zod 4.5.4 / Recharts 3.10.1      |
| 动效 / 图标        | Motion 13.1.1 / Lucide React 1.38.0               |
| 单元测试           | Vitest 4.1.11 + Testing Library                   |
| 端到端测试         | Playwright 1.62.1                                 |

TypeScript 固定为 6.0.3，而不是当时的 `latest` 7.0.2，因为 Next.js 16.3.4 的 ESLint TypeScript 解析链尚未支持 TypeScript 7。ESLint 同步固定在与 Next.js 插件兼容的 9.x。

## 已建立的工程能力

- Next.js App Router、React Server Components 和 TypeScript 路径别名 `@/*`。
- Tailwind CSS 4 PostCSS 管线、shadcn/ui tokens、`cn()` 工具与 Radix `Button` 基础组件。
- Motion、Lucide、Recharts、Zod、Zustand 已进入运行时依赖。
- ESLint Flat Config、Prettier、TypeScript strict、Vitest/Testing Library 与 Playwright 配置。
- Playwright 已识别 Chromium 冒烟流程；浏览器二进制留到需要正式运行 E2E 时安装。
- `.env.example` 仅列 `ZHIHU_ACCESS_SECRET`、AI provider、Key 和 model 变量名，没有真实值。
- `/api/health` 只返回应用状态、无 OAuth 状态、证据模式和 AI 降级模式，不读取或返回 Secret。
- 原 S03 校验命令保留为 `npm run validate:s03`。

## 质量验收

完整命令：

```powershell
npm run check
```

结果：

- ESLint：通过。
- TypeScript `tsc --noEmit`：通过。
- Vitest：3 个测试文件、3 个测试全部通过。
- Next.js 生产构建：通过。
- 生产路由：首页 `/` 为静态页面，`/api/health` 为动态服务端路由。
- Playwright 配置解析：识别 1 个 Chromium 冒烟测试。

运行态冒烟结果：

```text
GET /api/health -> 200
GET / -> 200
首页包含“人生分岔机”标题
fallback.narration -> template
zhihu.oauthEnabled -> false
```

## 知乎配置与凭证复核

- 项目 Skill manifest：0.5.0。
- 官方 CLI：0.5.0，与 Skill 兼容，无可用更新。
- CLI 状态：`auth.configured = true`，来源为系统钥匙串。
- `hackathon.config.json` 保持 `oauth.enabled = false`，没有 App ID、App Key 或回调地址。
- 未创建 `.env` 或 `.env.local`。
- 对源码、配置、测试和内容目录执行了已知 Secret、Bearer Token 与非空 `ZHIHU_ACCESS_SECRET` 扫描，未发现泄漏。

## 阶段边界

S04 只建立可靠工程底座和占位首页，不提前实现 S05 的完整视觉系统与五个页面，也不在本阶段安装 Playwright 浏览器二进制或接入实时知乎 API。
