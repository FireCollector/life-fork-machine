# TASK-041｜从知乎链接开始

- 状态：Done
- 依赖：TASK-032、TASK-033、TASK-034 Done
- 目标：从公开知乎问题、回答或文章进入通用的候选推演，而不是要求用户重复描述讨论。

## 已交付

- [x] 新增 `/zhihu-import`，支持公开 `question`、`answer` 与专栏 `p` 链接，并在请求前规范化与校验链接。
- [x] 仅复用知乎官方公开检索；页面写明不读取账号、私信、收藏、关注或私有内容，也不需要 OAuth。
- [x] 明确区分“找到原链接”“相关讨论”和“没有候选”；没有把相关结果伪装成原文。
- [x] 提供“最像我”与“让我不舒服”的双观点选择，要求来自不同的可追溯来源。
- [x] 所选观点通过通用 `CommunityLensSelection` 带进 `DecisionBrief`，改变候选包的假设与七天实验问题，而不只是替换引用卡。
- [x] 少于三条来源、链接不支持、频率限制和服务不可用均有明确停留或恢复说明。
- [x] 新增单元与浏览器路径验证，并更新使用说明和边界文档。

详见 [`docs/ZHIHU-LINK-IMPORT.md`](../../docs/ZHIHU-LINK-IMPORT.md) 与 [`verification/TASK-041/report.md`](../../verification/TASK-041/report.md)。
