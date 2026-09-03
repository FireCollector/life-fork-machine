# D08｜队友 Demo 验收记录

## 固定演示路线

- 新增 `/demo` 一键入口。
- 固定会话 ID：`demo-bridge-v1`。
- 固定 seed：`20260902`。
- 固定校准：12–24 个月现金安全垫、与伴侣共同承担风险、优先担心财务损失、追求自主性、先验证关键假设。
- 固定路线：搭桥试水 → 四周验证清单 → 条件式加入 → 爆破口头股权 → 验证后正式加入。

## 连续三轮结果

运行命令：

```bash
npm run test:e2e -- e2e/demo-smoke.spec.ts --repeat-each=3 --workers=1 --reporter=line
```

结果：3/3 通过，总耗时 21.8 秒。每轮均完成：

1. `/demo` 建立固定存档并进入第一幕；
2. 三幕行动与两次分岔回声；
3. 第三幕前假设爆破；
4. 结果页三世界雷达与 7 天实验；
5. 刷新结果页后从本地存档恢复。

产品阻断问题：0。

验收过程中修正：

- 将 E2E 首幕标题定位改为精确匹配，消除 H1/H2 同文案造成的测试歧义。
- 更新旧首页 smoke test，使断言与当前正式主标题一致。
- 本地 Playwright 改用已安装 Chrome，CI 仍使用 Playwright Chromium，避免队友首次运行必须额外下载浏览器。

## 完整自动化结果

- Playwright：5/5 通过，覆盖固定主路径、健康检查与 360/768/1440 三档溢出检查。
- Vitest：12 个测试文件、35 项测试通过。
- ESLint、TypeScript、Prettier、S03 内容校验、Next.js production build 全部通过。
- 额外通过 Codex 内置浏览器从首页 CTA 完成一轮完整体验并刷新结果页；运行日志无 warning/error。

## 交付物

- 队友操作卡、90 秒讲解稿、FAQ、已知边界和冲刺 backlog：`content/D08-demo-kit.md`。
- Playwright 主路径：`e2e/demo-smoke.spec.ts`。
- 固定演示配置：`src/features/game/demo-route.ts`。
