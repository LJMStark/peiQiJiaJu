@AGENTS.md

# Claude Code Notes

This file exists so Claude Code loads the shared repository instructions from `AGENTS.md`.

- Keep shared project rules in `AGENTS.md`.
- Add only Claude-specific notes here.
- If Claude-specific guidance grows beyond a few bullets, split it into additional markdown files and import them from here.
- Use `/memory` in Claude Code if you need to confirm which memory files are currently loaded.

### Critical Arch Notes
- **Storage**: We migrated from Supabase Storage to **Cloudflare R2**. Do NOT use `supabase.storage.*`. Always use `@aws-sdk/client-s3` wrappers in `lib/server/storage.ts`. All environment variables for R2 must be properly managed.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

## Project skill docs (.claude/skills/)

仓库自带 15 份实证技能文档（索引与路由表见 `.claude/skills/README.md`）。触碰下列区域前先读对应文档：

- 改热区（邀请/auth/历史/并发/存储）→ change-control-hot-zones
- 建表加列/迁移脚本 → change-control-schema-migrations；部署/超时/HTML 错误页 → change-control-deploy-zeabur
- 生成报错 → debug-generation-failures；历史/快照 bug → debug-history-room-snapshot；登录/邀请异常 → debug-auth-and-invites
- 技术选型/大重构立项 → archaeology-costly-failures；改文件前查雷 → archaeology-live-traps
- 动 generation_history/额度/兑换码-VIP 生效 → contract-credit-ledger；存储操作 → contract-storage-r2；并发/连接池 → contract-generation-concurrency；新 API/鉴权 → contract-api-auth-envelope
- 要命令/SQL/日志模式 → diagnostics-commands；宣称完成前 → acceptance-code-changes（涉及 UI 改动再加 acceptance-ui-changes）
