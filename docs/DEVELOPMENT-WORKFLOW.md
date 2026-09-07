# 任务驱动开发流程

本项目从 `TASK-027` 开始采用任务编号管理开发。目标是让 GitHub 提交历史直接说明“做了什么、属于哪项任务、是否经过验证”。已经发布的早期提交不重写。

## 一次任务的完整过程

### 1. 准备任务

1. 在 `tasks/README.md` 确认任务状态为 `Ready`，且依赖均为 `Done`。
2. 从 `docs/templates/TASK_TEMPLATE.md` 创建 `tasks/active/TASK-XXX-short-name.md`。
3. 写清目标、范围、非目标、验收条件和验证方式，再开始改代码。
4. 创建分支：`codex/task/TASK-XXX-short-name`。

### 2. 实现与提交

提交标题使用 Conventional Commits，并在末尾保留任务号：

```text
feat(topic): generate editable decision brief [TASK-031]
fix(topic): preserve constraints after retry [TASK-031]
test(topic): cover ambiguous and sensitive inputs [TASK-031]
docs(topic): record decision brief contract [TASK-031]
```

允许一个任务有多个提交。每个提交只承担一种职责，避免把功能、重构、格式化和无关修复压进同一个提交。

常用类型：

| 类型       | 用途                 |
| ---------- | -------------------- |
| `feat`     | 新增用户可感知能力   |
| `fix`      | 修复缺陷             |
| `test`     | 新增或调整测试       |
| `docs`     | 文档、任务或验证记录 |
| `refactor` | 不改变行为的结构调整 |
| `chore`    | 工程配置和维护       |
| `perf`     | 性能优化             |

`scope` 应指向稳定模块，例如 `ai`、`topic`、`evidence`、`scenario`、`experiment`、`report`、`auth`、`ux` 或 `repo`。

### 3. 验证

至少运行：

```bash
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

主路径发生变化时还要运行对应 E2E，并按任务需要检查桌面端、移动端、失败态、刷新恢复和降级路径。

验证结果写入 `verification/TASK-XXX/report.md`。截图只保留能证明关键状态的少量图片，不把重复截图全部提交到仓库。

### 4. 关闭任务

1. 将任务状态改为 `Verification`，逐项核对验收条件。
2. 验收通过后改为 `Done`，把任务文件移动到 `tasks/done`。
3. 更新任务板、相关架构文档和 README。
4. 最后一个提交使用 `docs(verification): close ... [TASK-XXX]`。
5. 推送分支并创建标题带 `[TASK-XXX]` 的 Pull Request；合并后再把下一项任务设为 `Ready`。

## Pull Request 标题

```text
feat(ai): deliver observable provider gateway [TASK-030]
```

PR 正文必须包含：目标结果、主要变化、测试证据、界面证据、已知边界和回滚方式。

## 什么时候拆分任务

出现以下任一情况就应拆分：

- 同时改变两个不相干的用户结果；
- 需要修改多个共享合同，原任务没有说明；
- 验收条件无法在一次完整体验中观察；
- 开发中发现一个独立缺陷，需要单独回归；
- 预计提交数量和改动范围已经让代码审查难以理解。

拆出的任务使用新编号，并在原任务中记录依赖，不用 `TASK-XXX-A` 这类临时编号。

## 紧急修复

紧急修复使用 `codex/hotfix/TASK-XXX-short-name`。同样需要任务文件、测试和验证记录，只是可以先缩小范围，后续再建立清理任务。
