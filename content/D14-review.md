# D14 通用场景数据结构验收记录

## 目标

让未来替换“要不要读研”“要不要合伙”等议题时，优先替换场景包，而不是重写游戏引擎和页面结构。当前创业 Demo 的玩法、分数和视觉保持不变。

## 已完成

- `WorldIdSchema` 改为命名空间无关的字符串，不再要求 `stay / leap / bridge`。
- `SourceIdSchema` 改为通用的 `zh-<namespace>-<number>` 命名规则，不再锁定 `zh-startup-xx`。
- 世界回声校验改为根据场景包中的世界列表动态检查，仍要求每条世界线只能回声到其他世界。
- 假设的 `deltaByWorld`、事实、不可逆后果和离线叙事改为动态世界映射，并由内容解析器检查每个世界是否有完整配置。
- 状态维度展示标签从页面硬编码迁移到 `scenario.stateModel.dimensions`，校验脚本也从场景包动态读取维度列表。
- 世界轨道、世界选择卡和结果雷达优先使用场景数据中的世界 ID 与名称；未知新世界会自动使用位置对应的视觉色板，不会因 ID 改名崩溃。
- 新增统一的 `ScenarioPack` 归一化结构：`problem`、`constraints`、`dimensions`、`worlds`、`acts`、`actions`、`assumptions`、`experiments`、`sources`。
- `demoContent.pack` 作为未来用户议题生成器和页面的统一入口，当前仍保留原始 `scenario / outcomes / sourceCards` 兼容调用。

## 当前边界

- 为保证本届 Demo 行为稳定，状态向量仍沿用现有六个数值键，世界数量仍为三条，三幕和每幕三个行动规则保持不变。
- D14 已把 ID、名称、维度标签和内容集合抽成可替换包；真正支持任意数量维度、幕数和行动数，留到后续冲刺阶段。

## 验收结果

- S03 内容校验通过，维度列表由场景包动态读取。
- TypeScript 检查通过。
- ESLint 检查通过。
- 完整测试通过：12 个测试文件、39 项测试。
- `ScenarioPack` 聚合结构已由内容契约测试覆盖。
- 生产构建通过，Next.js 路由全部正常生成。
