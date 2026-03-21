# Repository Guidelines

## Project Structure & Module Organization
Next.js 15 App Router app for AI furniture visualization.

- `app/`: routes, layouts, error boundaries, and API endpoints under `app/api/*`
- `components/`: client-facing UI, with room editor subcomponents in `components/room-editor/`
- `lib/`: shared domain logic; keep browser helpers in `lib/client/` and server-only logic in `lib/server/`
- `tests/`: Node-based unit and integration tests named `*.test.ts` or `*.test.mjs`
- `scripts/`: local startup helpers and one-off migration scripts
- `public/`: static assets
- `docs/plans/`: design and implementation notes

Use the `@/*` import alias when it improves readability.

## Build, Test, and Development Commands
- `npm install`: install dependencies
- `npm run dev`: start the local dev server
- `npm run build`: create a production build
- `npm run start`: run the production server via `scripts/start-next.mjs`
- `npm run lint`: run ESLint across the repo
- `node --test tests/*.test.ts tests/*.test.mjs`: run the test suite
- `npx tsc --noEmit`: run a type-check pass
- `npm run auth:migrate`, `npm run storage:migrate`, `npm run invite:migrate`: run data or auth migrations with `.env`

## Coding Style & Naming Conventions
Use TypeScript with strict typing, React function components, and small focused modules. Follow the existing style: 2-space indentation, single quotes, and semicolons.

- Components: `PascalCase.tsx`
- Helpers and state modules: `kebab-case` or domain-oriented filenames such as `room-editor-room-state.ts`
- Variables and functions: `camelCase`

Keep UI copy in Chinese unless a route or integration clearly requires English. Prefer API routes for client mutations; do not import `app/actions` directly into client components.

## Testing Guidelines
Tests use Node’s built-in runner (`node:test`) with `assert/strict`. Add or update tests before changing behavior, especially for `lib/` state helpers and API-adjacent logic. Always run:

`node --test tests/*.test.ts tests/*.test.mjs`

If you touch typing-sensitive code, also run `npx tsc --noEmit`.

## Commit & Pull Request Guidelines
Follow the repository’s conventional commit style:

- `feat: add invitation link system`
- `fix: harden room editor bootstrap against history failures`
- `docs: add design review audit artifacts`
- `style(design): improve mobile header touch targets`

PRs should include a clear summary, affected routes or modules, screenshots for UI changes, any required env or migration steps, and the exact verification commands you ran.

## Security & Configuration Tips
Keep secrets in `.env` or `.env.local`; never commit real keys. Document auth, storage, or invitation migration impact in the PR.
