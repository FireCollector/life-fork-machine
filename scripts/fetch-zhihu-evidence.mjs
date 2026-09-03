#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const query = readOption("--query", "跟领导创业 辞职 股权 现金流 如何选择");
const count = readOption("--count", "10");
const defaultCli =
  process.platform === "win32"
    ? join(process.env.LOCALAPPDATA ?? "", "ZhihuCLI", "current", "zhihu-cli.exe")
    : "zhihu-cli";
const cliPath = process.env.ZHIHU_CLI_PATH || defaultCli;
const outputPath = readOption(
  "--output",
  join("content", "evidence", "zhihu-search-latest.json")
);

if (!query.trim()) {
  console.error("--query 不能为空");
  process.exit(1);
}
if (!existsSync(cliPath) && cliPath !== "zhihu-cli") {
  console.error(`找不到知乎 CLI：${cliPath}。请先按官方 Skill 完成安装。`);
  process.exit(1);
}

const result = spawnSync(
  cliPath,
  ["search", "zhihu", "--query", query, "--count", count],
  { encoding: "utf8" }
);
if (result.error) {
  console.error(`知乎搜索启动失败：${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(result.stderr?.trim() || "知乎搜索失败");
  process.exit(result.status || 1);
}

let envelope;
try {
  envelope = JSON.parse(result.stdout);
} catch {
  console.error("知乎 CLI 返回的不是有效 JSON");
  process.exit(1);
}
if (envelope.Code !== 0 || !envelope.Data?.Items) {
  console.error(envelope.Message || "知乎搜索没有返回素材");
  process.exit(1);
}

const items = envelope.Data.Items.map((item, index) => ({
  id: `zh-search-${String(index + 1).padStart(2, "0")}`,
  contentId: String(item.ContentID ?? ""),
  title: item.Title ?? "未命名内容",
  url: item.Url ?? "",
  author: item.AuthorName ?? "未知作者",
  contentType: item.ContentType ?? "Unknown",
  excerpt: item.ContentText ?? "",
  voteUpCount: Number(item.VoteUpCount ?? 0),
  rankingScore: Number(item.RankingScore ?? 0)
}));

const payload = {
  schemaVersion: 1,
  query,
  retrievedAt: new Date().toISOString(),
  source: "zhihu_open_platform",
  items
};
const absoluteOutput = resolve(process.cwd(), outputPath);
mkdirSync(dirname(absoluteOutput), { recursive: true });
writeFileSync(absoluteOutput, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`已写入 ${items.length} 条知乎素材：${absoluteOutput}`);
