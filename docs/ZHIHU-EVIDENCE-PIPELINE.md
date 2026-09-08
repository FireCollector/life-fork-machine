# 动态知乎证据检索

`TASK-032` 为已确认的 `DecisionBrief` 提供服务端检索接口。它把一个人生议题拆成多个检索角度，取回可追溯的知乎经验候选，供后续的观点整理与人工审核使用。

## 前置条件

本机需要按官方 `zhihu` Skill 完成 CLI 登录。Windows 默认使用：

```text
%LOCALAPPDATA%\ZhihuCLI\current\zhihu-cli.exe
```

也可以在 `.env.local` 设置 `ZHIHU_CLI_PATH` 指向 CLI。Access Secret 只由官方 CLI 的系统钥匙串管理，不能写入 `.env.local`、浏览器请求、仓库或日志。

## 调用接口

向 `POST /api/evidence/zhihu` 发送已通过 `DecisionBriefSchema` 的完整简报。例如：

```json
{
  "version": 1,
  "id": "brief-example",
  "originalQuestion": "稳定高薪工作还是跟领导创业，怎么选？",
  "normalizedQuestion": "稳定高薪工作还是跟领导创业，怎么选？",
  "options": ["稳定高薪工作", "跟领导创业"],
  "people": ["领导"],
  "constraints": [{ "category": "cash", "text": "现金流和投入上限" }],
  "irreversibleCosts": ["做出不可逆承诺前需要确认的时间、资金或关系成本"],
  "unknowns": ["股权、客户和现金流是否有可验证材料"],
  "assumptions": ["创业邀请会带来预期结果"],
  "clarificationQuestions": [],
  "safety": {
    "status": "ready",
    "message": "这是可编辑的决策简报，不是推荐结论。"
  },
  "confirmed": true
}
```

服务会生成 2–4 组不同角度的查询，例如原始困境、两条路的直接比较，以及约束与未知信息的核验角度。相同内容会按 `contentId` 去重，但会保留命中的检索词。

## 返回边界

成功结果只包含：内容 ID、标题、作者、原文链接、最多 600 字摘要、互动数据、抓取时间和命中的检索词。服务端缓存五分钟，响应始终设置为不被浏览器中间层缓存。

`status` 可能是：

- `ready`：拿到待审核候选；
- `empty`：本次没有合格候选；
- `rate-limited`：官方检索额度或频率受限；
- `unavailable`：CLI、网络或输入不可用。

无论哪种状态，接口都不会自动采纳内容、生成事实结论或直接写入正式场景。`TASK-033` 已将候选来源拆成可追溯的观点和证据结构，并接入人工修订流程，详见 [`EVIDENCE-ORGANIZATION.md`](EVIDENCE-ORGANIZATION.md)。
