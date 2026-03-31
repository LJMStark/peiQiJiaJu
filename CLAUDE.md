@AGENTS.md

# Claude Code Notes

This file exists so Claude Code loads the shared repository instructions from `AGENTS.md`.

- Keep shared project rules in `AGENTS.md`.
- Add only Claude-specific notes here.
- If Claude-specific guidance grows beyond a few bullets, split it into additional markdown files and import them from here.
- Use `/memory` in Claude Code if you need to confirm which memory files are currently loaded.

### Critical Arch Notes
- **Storage**: We migrated from Supabase Storage to **Cloudflare R2**. Do NOT use `supabase.storage.*`. Always use `@aws-sdk/client-s3` wrappers in `lib/server/storage.ts`. All environment variables for R2 must be properly managed.
