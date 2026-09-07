# 参与开发

感谢你参与《人生分岔机》。这是一个面向知乎 AI 黑客松的互动叙事 Demo，欢迎提交场景、规则和体验改进。

## 开始之前

```bash
npm install
npm run dev
```

Node.js 需要 22+。提交前请运行：

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## 修改约定

- 场景文本放在 `content/scenarios`，规则和状态转换放在 `src/features/game`，不要把业务规则散落在页面组件里。
- 新增知乎素材时保留来源 URL、来源 ID、作者和适用边界；候选素材必须经过 `/evidence-review` 审核才能进入正式场景。
- 任何实验、报告或分享摘要都必须能由同一份 session 状态确定性复现。
- 不提交 `.env`、Access Secret、用户账号信息、浏览器缓存和本地生成文件。
- 面向参赛演示的文案优先使用短句和口语化表达，避免把反思文本写成预测或建议。

## 任务与提交

从 `TASK-027` 开始，开发必须先在 [`tasks/README.md`](tasks/README.md) 领取一个 `Ready` 任务。完整流程见 [`docs/DEVELOPMENT-WORKFLOW.md`](docs/DEVELOPMENT-WORKFLOW.md)。

提交标题格式：

```text
type(scope): concise result [TASK-XXX]
```

例如：

```text
feat(ai): add structured provider response [TASK-030]
test(ai): cover timeout and schema failures [TASK-030]
docs(verification): close provider gateway [TASK-030]
```

一个任务可以有多个小提交，但同一提交不能混入其他任务。

## Pull Request 自检

- [ ] 说明改动解决的用户问题
- [ ] 补充或更新测试
- [ ] 通过 lint、typecheck、unit test 和 build
- [ ] 若改变演示路径，同步更新 `content/D08-demo-kit.md` 与 `docs/DEMO-RUNBOOK.md`
- [ ] 标题和所有提交包含同一个 `[TASK-XXX]`
- [ ] 更新任务文件、任务板与验证报告
- [ ] 未引入未经审核的外部内容或个人隐私
