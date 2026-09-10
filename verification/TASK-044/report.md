# TASK-044 验证报告

## 已验证

- `npm run lint` 通过。
- `npm run typecheck` 通过。
- `npm test` 通过：30 个测试文件、102 项测试。
- `npm run build` 通过，`/privacy` 已生成。
- Supabase Auth 设置接口可由项目 anon 配置访问；邮箱认证能力已开启。

## 手动启用步骤

anon key 无权创建数据库表，这是 Row Level Security 的必要边界。请在 Supabase Dashboard 的 SQL Editor 执行：

`supabase/migrations/20260910_task044_privacy.sql`

之后，在本地打开 `/privacy`：输入邮箱并完成一次性链接验证，点击“同步这 N 条本地档案”，再点击“恢复云端较新版本”。最后可点击“清除云端副本”确认本地档案不受影响。
