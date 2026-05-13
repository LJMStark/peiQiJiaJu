# Shared Agent Instructions

This file contains repository-wide instructions shared by coding agents.

- Keep cross-agent project rules here.
- Keep tool-specific additions in the tool's own file.
- If a subtree needs stricter rules, add a nested `AGENTS.md` near that code.

## 1. Scope

- These instructions apply to the whole repository unless a deeper `AGENTS.md` overrides them for a subtree.
- Do not put personal preferences here; keep this file team-shared and repository-specific.

## 2. Language

- Default to Chinese unless the user explicitly requests another language.

## 3. Required Workflow

Every task must follow this order:

1. Scope
   - Identify the affected files, modules, and commands.
   - Do not assume code, APIs, tables, or env vars exist.
2. Read
   - Read the relevant code and docs before editing.
3. Plan
   - Write a minimal 3-7 step plan before implementation.
   - Split the work first if it touches more than 3 files, is risky, or has unclear scope.
4. Implement
   - Apply the smallest viable diff.
   - Avoid speculative cleanup or unrelated refactors.
5. Verify
   - Run the relevant tests, checks, or build commands.
   - Use actual command output as evidence.
   - Never claim success without verification.
6. Done
   - A task is done only when the code builds or runs, checks pass when applicable, and behavior matches the requirement.

## 4. Debugging and Reliability

- Prefer root-cause fixes over fallbacks.
- Do not add retries, guards, or alternate paths just to hide failures.
- Do not mock success paths in production code.
- Do not swallow errors.
- If behavior is unknown, fail explicitly and surface the real error.

## 5. Anti-Hallucination Rules

- Verify functions, files, commands, schemas, and APIs before using them.
- If something is missing, stop and report it instead of inventing it.
- Do not assume package scripts or infrastructure exist without reading the repo.

## 6. Code Change Policy

- Keep changes minimal and task-focused.
- Do not rewrite large modules unless explicitly requested.
- Do not introduce abstractions without a clear reuse or testability need.
- Do not mutate input parameters unless there is a strong, local reason.

## 7. Testing and Verification Rules

- Never weaken tests just to make them pass.
- Never edit assertions to hide a defect.
- If a test fails, assume the implementation is wrong first.
- If you touch typing-sensitive code, run a type check as part of verification.

## 8. Failure Handling

- No silent failure.
- No empty `catch`.
- Do not mask unknown failures with `null`, `[]`, or placeholder defaults.
- Propagate unknown errors unless there is a documented reason not to.

## 9. Repository Structure

Next.js 15 App Router app for AI furniture visualization.

- `app/`: routes, layouts, error boundaries, and API endpoints under `app/api/*`
- `components/`: client-facing UI, with room editor subcomponents in `components/room-editor/`
- `lib/`: shared domain logic; keep browser helpers in `lib/client/` and server-only logic in `lib/server/`
- `tests/`: Node-based unit and integration tests named `*.test.ts` or `*.test.mjs`
- `scripts/`: local startup helpers and one-off migration scripts
- `public/`: static assets
- `docs/plans/`: design and implementation notes

Use the `@/*` import alias when it improves readability.

## 10. Build, Test, and Development Commands

- `npm install`: install dependencies
- `npm run dev`: start the local dev server
- `npm run build`: create a production build
- `npm run start`: run the production server via `scripts/start-next.mjs`
- `npm run lint`: run ESLint across the repo
- `node --test tests/*.test.ts tests/*.test.mjs`: run the test suite
- `npx tsc --noEmit`: run a type-check pass
- `npm run auth:migrate`: run auth migrations with `.env`
- `npm run invite:migrate`: run invitation migrations with `.env`

## 11. Coding Style and Naming

- Use TypeScript with strict typing, React function components, and small focused modules.
- Follow the existing style: 2-space indentation, single quotes, and semicolons.
- Components: `PascalCase.tsx`
- Helpers and state modules: `kebab-case` or domain-oriented filenames such as `room-editor-room-state.ts`
- Variables and functions: `camelCase`
- Keep UI copy in Chinese unless a route or integration clearly requires English.
- Prefer API routes for client mutations; do not import `app/actions` directly into client components.

## 12. Security and Secrets

- Never hardcode secrets.
- Keep secrets in `.env` or `.env.local`.
- Validate external input.
- Use parameterized queries for database access.
- Only warn about secrets when they appear in source code, not when the user pastes them in chat.

## 13. Commits and Pull Requests

- Follow conventional commit style such as:
  - `feat: add invitation link system`
  - `fix: harden room editor bootstrap against history failures`
  - `docs: add design review audit artifacts`
  - `style(design): improve mobile header touch targets`
- PRs should include a clear summary, affected routes or modules, screenshots for UI changes, required environment or migration steps, and the exact verification commands that were run.

## 14. Maintenance

- Keep this file concise, explicit, and repository-specific.
- When shared instructions change, update this file first.
- Keep `CLAUDE.md` thin and Claude-specific; it should not duplicate this file's full content.

## 15. Storage & Cloud Architecture

- **PostgreSQL & Auth**: Managed by Supabase.
- **File Storage**: ALL image and asset storage is handled by Cloudflare R2 via the `@aws-sdk/client-s3` library. 
- **CRITICAL RULE**: Do **NOT** use Supabase Storage `supabase.storage` APIs anymore. All uploads, downloads, and copies must go through the functions defined in `lib/server/storage.ts` which uses the S3 protocol to interface with R2. All media URLs point to `assets.peiqijiaju.xyz`.

## 16. Deployment Platform

- **Production runtime**: Zeabur, running on a self-hosted VPS as a long-lived Node.js process (`npm run start` → `scripts/start-next.mjs`). This is **NOT** a serverless / edge deployment.
- **Implications when diagnosing issues**:
  - There is **no Vercel-style function timeout** (no 60s/300s `maxDuration`, no `FUNCTION_INVOCATION_TIMEOUT`). Long-running requests like AI image generation are limited only by the reverse proxy / client timeouts in front of the VPS.
  - HTML error pages (`<!DOCTYPE …`) seen by the client almost always come from **Zeabur's edge router, the upstream reverse proxy, or a Node process crash/restart** — not from a serverless cold start or timeout. Check the Zeabur logs, not Vercel.
  - Do not add `export const maxDuration = …` or `vercel.json` configuration; they have no effect here.
  - Concurrency is handled by a single Node.js process; in-memory state is shared across all requests on that instance.
