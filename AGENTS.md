<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project task workflow

- Before implementation, read `tasks/README.md`, the active task file, and the relevant section of `docs/PRODUCT-ROADMAP.md`.
- Work on one primary task at a time. Future product work starts at `TASK-027`.
- Create branches as `codex/task/TASK-XXX-short-name`; use `codex/hotfix/TASK-XXX-short-name` for urgent fixes.
- Commit titles must use `type(scope): concise result [TASK-XXX]`.
- Multiple focused commits may share one task ID; never mix unrelated task IDs in one commit.
- A task is Done only after its acceptance criteria pass and `verification/TASK-XXX/report.md`, the task board, and affected docs are updated.
- Do not rewrite the published D01–D26 history merely to manufacture task commits.
