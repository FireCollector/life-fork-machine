# TASK-041 验证记录

## 覆盖项

- 链接规范化：问题、回答、文章三种公开 URL；拒绝非知乎域名。
- 观点选择：禁止同一来源同时代表“最像我”和“不舒服”。
- 生成影响：不同来源选择会改变规则候选包的关键假设和实验问题。
- 浏览器路径：链接导入页显示公开数据授权边界；桌面、平板和手机页面纳入无横向溢出巡检。
- 安全边界：链接不触发网页抓取，不使用 OAuth，不输出自动发布能力。

## 命令

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## 结果

- `npm run lint`：通过。
- `npm run typecheck`：通过。
- `npm test`：28 个文件、98 项测试全部通过。
- `npm run build`：通过；`/zhihu-import` 与 `/api/evidence/zhihu-link` 已进入产物。
- `npm run test:e2e`：10 项 Chromium 路径测试全部通过，包含链接导入授权边界和三种视口无横向溢出检查。
