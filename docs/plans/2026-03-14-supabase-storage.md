# Supabase Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist all furniture, room, and generated images in Supabase Storage while keeping metadata and ownership in Supabase Postgres.

**Architecture:** Better Auth continues to own user sessions. Authenticated Next.js route handlers use the Supabase service role key for Storage operations and return signed URLs back to the React dashboard. The Gemini generation flow stays client-side, but uploaded/generated assets are persisted server-side.

**Tech Stack:** Next.js App Router, React 19, Better Auth, PostgreSQL via `pg`, Supabase Storage via `@supabase/supabase-js`

---

### Task 1: Add Storage dependencies and environment scaffolding

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `lib/supabase-admin.ts`
- Create: `lib/storage-config.ts`

**Step 1: Write the failing test**

Add a small test for storage config validation helpers.

**Step 2: Run test to verify it fails**

Run the targeted test command and confirm missing helper/module failure.

**Step 3: Write minimal implementation**

- install `@supabase/supabase-js`
- add env parsing for `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- define bucket names and shared limits

**Step 4: Run test to verify it passes**

Run the targeted test command and confirm green.

**Step 5: Commit**

Commit env and server config scaffolding.

### Task 2: Add database tables and bucket bootstrap script

**Files:**
- Create: `scripts/migrate-storage-assets.mjs`
- Modify: `package.json`

**Step 1: Write the failing test**

Add a test for SQL helper output or script validation logic if extracted to a helper.

**Step 2: Run test to verify it fails**

Run the targeted test command and confirm the missing script/helper fails.

**Step 3: Write minimal implementation**

- create tables for `furniture_items`, `room_images`, `generation_history`
- create or verify the three private buckets
- add a script entry such as `storage:migrate`

**Step 4: Run test to verify it passes**

Run the targeted test command, then run the migration script against the configured database when credentials are available.

**Step 5: Commit**

Commit schema/bootstrap work.

### Task 3: Build authenticated asset APIs

**Files:**
- Create: `lib/auth-session.ts`
- Create: `lib/server/storage.ts`
- Create: `app/api/catalog/route.ts`
- Create: `app/api/catalog/[id]/route.ts`
- Create: `app/api/rooms/route.ts`
- Create: `app/api/rooms/[id]/route.ts`
- Create: `app/api/history/route.ts`

**Step 1: Write the failing test**

Add helper tests for input validation and storage path generation.

**Step 2: Run test to verify it fails**

Run the targeted test command and confirm expected failure.

**Step 3: Write minimal implementation**

- validate uploads
- require Better Auth session
- upload/delete files in Supabase Storage
- insert/update/delete rows in Postgres
- return signed URLs for API consumers

**Step 4: Run test to verify it passes**

Run targeted tests, then lint the new API surface.

**Step 5: Commit**

Commit the API layer.

### Task 4: Refactor dashboard data flow away from base64

**Files:**
- Create: `lib/dashboard-types.ts`
- Create: `lib/client/image-utils.ts`
- Modify: `components/Dashboard.tsx`
- Modify: `components/Catalog.tsx`
- Modify: `components/RoomEditor.tsx`

**Step 1: Write the failing test**

Add tests for pure client helpers such as aspect-ratio selection and data URL parsing.

**Step 2: Run test to verify it fails**

Run the targeted test command and confirm failure.

**Step 3: Write minimal implementation**

- load persisted assets from the API on startup
- upload furniture and room files through the new routes
- render signed URLs instead of inline base64
- keep temporary base64 conversion only for the Gemini request payload
- post generated outputs to the history API for Storage persistence

**Step 4: Run test to verify it passes**

Run helper tests, lint, and build.

**Step 5: Commit**

Commit the frontend integration.

### Task 5: Finish verification and environment guidance

**Files:**
- Modify: `next.config.ts`
- Modify: `.env.example`
- Optionally modify: local `.env`

**Step 1: Write the failing test**

Use build verification as the failing check if remote image configuration is missing.

**Step 2: Run test to verify it fails**

Run `npm run build` if remote URLs are not yet accepted.

**Step 3: Write minimal implementation**

- allow the Supabase hostname in `next/image`
- add the new env vars to docs/example config
- document the remaining secret the user must provide

**Step 4: Run test to verify it passes**

Run:

```bash
npm run lint
npm run build
node --env-file=.env scripts/migrate-storage-assets.mjs
```

**Step 5: Commit**

Commit the finished step once verification is complete.
