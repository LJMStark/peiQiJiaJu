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
