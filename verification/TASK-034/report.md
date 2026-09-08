# TASK-034 验证报告

- 结果：PASS
- 场景合同：新增 Candidate ScenarioPack v2。每个候选必须有 3 条世界线、每条 3 幕、每幕 3 个动作，并保留来源、行动时长、金钱上限、假设、实验和审核状态。
- 门禁：所有引用必须属于本次检索来源；时间预算限制为 5–480 分钟，金钱预算限制为 0–2000 元；重复 ID、外来引用和敏感主题文本均会被拒绝。`publicationAllowed` 固定为 `false`。
- 真实流程：议题实验室已连接候选三幕接口。AI 候选通过既有 Schema 时标为 `ai-assisted`；AI 不可用或结构失败时仅用本次检索来源生成明确标记的 `rules-assisted` 草稿。
- 界面：审核视图展示每条世界的取舍、待核对项、三幕、27 个动作预算、结构统计和发布阻塞原因；不会替换现有正式创业 Demo。
- 质量检查：`npm run lint`、`npm run typecheck`、`npm test`（21 个文件、74 项）和 `npm run build` 通过。
