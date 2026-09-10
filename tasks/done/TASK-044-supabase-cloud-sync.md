# TASK-044｜本地优先的云端同步与隐私边界

- 状态：代码完成，等待一次 Supabase SQL 迁移启用生产数据表。
- 交付：`/privacy` 邮箱一次性登录、显式同步、按更新时间恢复、云端副本清除与退出登录。
- 数据边界：未登录时不发出档案；同步前显示本地条数并要求用户点击确认；本地较新的记录不会被云端旧版本覆盖。
- 权限边界：迁移以 `owner_id` 和 Row Level Security 限定为当前认证用户；浏览器仅使用可公开的 anon key，不含 service-role key。
- 验证：lint、类型检查、102 项单元测试、生产构建通过。
- 启用：在 Supabase SQL Editor 执行 `supabase/migrations/20260910_task044_privacy.sql`。
