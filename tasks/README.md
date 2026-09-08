# Task Board

这里是《人生分岔机》的开发任务总表。长期方向和每一步的详细内容见 [`docs/PRODUCT-ROADMAP.md`](../docs/PRODUCT-ROADMAP.md)。

## 工作规则

- 同一时间只推进一个主要任务。
- 只有状态为 `Ready` 且依赖项已经完成的任务才能开始。
- 开始前在 `tasks/active` 创建任务文件，写清范围、验收条件和允许修改的文件。
- 所有相关提交都带同一个任务编号，例如 `feat(ai): parse decision brief [TASK-031]`。
- 一个任务可以有多个提交，例如 `feat`、`test`、`fix`、`docs`，但不能混入其他任务。
- 自动检查、人工体验和文档同步完成后，任务才能标记为 `Done`，并在 `verification/TASK-XXX/report.md` 留下结果。
- 发现任务明显超过当前范围时，拆成新的任务，不在原提交里顺手扩大范围。

## 状态说明

| 状态         | 含义                             |
| ------------ | -------------------------------- |
| Planned      | 已进入路线，但依赖或范围尚未冻结 |
| Ready        | 可以开始执行                     |
| In Progress  | 正在开发                         |
| Verification | 功能完成，正在验收               |
| Done         | 验收通过，代码与文档已同步       |
| Blocked      | 有明确阻塞，并已记录解除条件     |

## 任务依赖

```text
TASK-027 产品定义
  → TASK-028 用户研究
  → TASK-029 AI 边界
  → TASK-030 Provider 网关
  → TASK-031 任意议题理解
  → TASK-032 知乎检索
  → TASK-033 证据整理
  → TASK-034 场景生成
  → TASK-035 动态叙事
  → TASK-036 隐藏输入评测
  → TASK-037 第二完整场景
  → TASK-038–040 真实七天实验与复盘
  → TASK-041–043 知乎原生闭环与协作
  → TASK-044–048 产品化
  → TASK-049–051 可选创新
```

## 任务列表

| Task     | 状态    | 依赖              | 目标结果                         |
| -------- | ------- | ----------------- | -------------------------------- |
| TASK-027 | Done    | D01–D26 Demo 基线 | 冻结长期产品定义与成功指标       |
| TASK-028 | Blocked | TASK-027          | 完成第一轮真实用户研究           |
| TASK-029 | Done    | TASK-027、028*    | 冻结 AI 与规则引擎边界           |
| TASK-030 | Done    | TASK-029          | 建立服务端 AI Provider 网关      |
| TASK-031 | Done    | TASK-030          | 把任意议题整理成可编辑决策简报   |
| TASK-032 | Done    | TASK-031          | 建立动态知乎证据检索管线         |
| TASK-033 | Done    | TASK-032          | 将回答整理为可追溯观点与证据结构 |
| TASK-034 | Done    | TASK-031、033     | 生成可审核的候选 ScenarioPack    |
| TASK-035 | Planned | TASK-034          | 接入动态叙事与针对性追问         |
| TASK-036 | Planned | TASK-031–035      | 建立 AI 评测和隐藏输入测试集     |
| TASK-037 | Planned | TASK-034–036      | 交付第二个完整可玩议题           |
| TASK-038 | Planned | TASK-037          | 分离演示实验与真实七天实验       |
| TASK-039 | Planned | TASK-038          | 根据真实反馈动态调整实验         |
| TASK-040 | Planned | TASK-038、039     | 建立长期决策档案与复盘           |
| TASK-041 | Planned | TASK-032、033     | 支持从知乎问题或内容链接开始     |
| TASK-042 | Planned | TASK-040、041     | 把验证结果整理回知乎表达         |
| TASK-043 | Planned | TASK-040          | 加入受控多人视角与经验贡献       |
| TASK-044 | Planned | TASK-040          | 建立账号、云端会话与隐私中心     |
| TASK-045 | Planned | TASK-034、044     | 建立场景编辑与内容运营后台       |
| TASK-046 | Planned | TASK-030、044     | 补齐可观测性、可靠性和安全       |
| TASK-047 | Planned | TASK-028、037     | 完成体验、无障碍与性能优化       |
| TASK-048 | Planned | TASK-044–047      | 公开部署并建立持续验证机制       |
| TASK-049 | Planned | TASK-037、040     | 探索有证据边界的未来自我角色     |
| TASK-050 | Planned | TASK-033、037     | 探索对立观点议事桌               |
| TASK-051 | Planned | TASK-040、044     | 探索个人决策模式回顾             |

`*` TASK-028 的预研究输入已完成，但真人研究仍被阻塞；项目负责人已授权 TASK-029 先冻结安全的 AI 合同，后续必须用真人研究修订优先级。

当前任务：`TASK-035`。下一步将在已审核候选场景中接入动态叙事与针对性追问；TASK-028 仍等待真人研究结果。
