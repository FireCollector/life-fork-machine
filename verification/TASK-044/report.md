# TASK-044 验证报告

## 已验证

- `npm run lint` 通过。
- `npm run typecheck` 通过。
- `npm test` 通过：30 个测试文件、102 项测试。
- `npm run build` 通过，`/privacy` 已生成。
- Supabase Auth 设置接口可由项目 anon 配置访问；邮箱认证能力已开启。
- 数据库迁移已执行：`decision_sessions` REST 查询返回 `200` 和空列表，证明表已部署，匿名请求未获得任何档案数据。
- 本地 `/privacy` 与 `/api/health` 返回 `200`，同步入口可访问。

## 手动启用步骤

anon key 无权创建数据库表，这是 Row Level Security 的必要边界。迁移现已由项目管理员执行：

`supabase/migrations/20260910_task044_privacy.sql`

现在可在本地打开 `/privacy`：输入邮箱并完成一次性链接验证，点击“同步这 N 条本地档案”，再点击“恢复云端较新版本”。最后可点击“清除云端副本”确认本地档案不受影响。
