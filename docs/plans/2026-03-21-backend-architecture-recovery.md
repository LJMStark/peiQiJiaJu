# Backend Architecture Recovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the backend around standard route/service/repository boundaries, close the current trust-boundary bugs, and reduce frontend-backend coupling without changing product behavior.

**Architecture:** Next.js App Router route handlers remain the HTTP entrypoints, but they become thin adapters that only do auth, input validation, and response mapping. Business rules move into `lib/server/services/*`, SQL moves into `lib/server/repositories/*`, and external systems such as Supabase Storage and Gemini stay behind explicit integration helpers. Frontend components stop sending privileged storage paths and only send owned resource IDs.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Better Auth, PostgreSQL via `pg`, Supabase Storage, Gemini, Node test runner

---

## Target Layout

- `app/api/*`: auth gate, request parsing, status codes, response envelopes
- `app/actions/*`: page-only entrypoints that call shared services
- `lib/server/services/*`: business rules and transaction orchestration
- `lib/server/repositories/*`: SQL only
- `lib/server/integrations/*` or existing `lib/server/storage.ts` / `lib/server/gemini.ts`: external providers only
- `components/*`: UI and local state only, no business fallbacks that bypass server ownership checks

## Non-Goals

- No UI redesign
- No provider swap away from Better Auth / Supabase / Gemini
- No schema rewrite beyond removing runtime DDL fallback and adding explicit migrations

## Rules For This Refactor

- Do not accept `storagePath` or other privileged object pointers from the browser.
- Do not call server actions from API routes.
- Do not run `ALTER TABLE` in request handlers or service functions.
- Do not hide partial failures unless the API contract explicitly returns a partial result marker.
- Do not ship new endpoints without request validation and consistent error envelopes.

### Task 1: Standardize API validation and error envelopes

**Files:**
- Create: `lib/server/http/error-envelope.ts`
- Create: `lib/server/http/request-parsers.ts`
- Modify: `lib/server/api-utils.ts`
- Modify: `app/api/generate/route.ts`
- Modify: `app/api/history/route.ts`
- Modify: `app/api/invitations/signup/route.ts`
- Modify: `app/api/vip/redeem/route.ts`
- Test: `tests/api-error-response.test.ts`

**Step 1: Write the failing test**

Add response-shape tests for:
- internal errors being sanitized
- validation errors returning a stable error code/message pair
- unauthorized and forbidden responses keeping the same envelope

**Step 2: Run test to verify it fails**

Run: `node --test tests/api-error-response.test.ts`

Expected: FAIL because the shared error envelope helpers do not exist yet.

**Step 3: Write minimal implementation**

- add a shared error envelope builder
- centralize `400/401/403/404/409/422/500` response helpers
- parse request bodies with explicit field extraction helpers instead of ad hoc `typeof body?.x === 'string'`
- update the touched routes to return the same envelope structure

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/api-error-response.test.ts`
- `npx tsc --noEmit`

Expected: PASS

**Step 5: Commit**

```bash
git add lib/server/http/error-envelope.ts lib/server/http/request-parsers.ts lib/server/api-utils.ts app/api/generate/route.ts app/api/history/route.ts app/api/invitations/signup/route.ts app/api/vip/redeem/route.ts tests/api-error-response.test.ts
git commit -m "refactor: standardize api validation and error envelopes"
```

### Task 2: Split asset SQL and orchestration out of `lib/server/assets.ts`

**Files:**
- Create: `lib/server/repositories/furniture-repository.ts`
- Create: `lib/server/repositories/room-repository.ts`
- Create: `lib/server/repositories/history-repository.ts`
- Create: `lib/server/presenters/asset-presenter.ts`
- Create: `lib/server/services/asset-service.ts`
- Modify: `lib/server/assets.ts`
- Modify: `app/api/catalog/route.ts`
- Modify: `app/api/catalog/[id]/route.ts`
- Modify: `app/api/rooms/route.ts`
- Modify: `app/api/rooms/[id]/route.ts`
- Test: `tests/room-image-policy.test.ts`
- Test: `tests/room-image-cleanup.test.ts`

**Step 1: Write the failing test**

Add or extend tests that lock these rules:
- deleting a room only deletes orphaned storage
- replacing a room keeps the newest row only
- presenter logic for signed URLs stays separate from repository logic

**Step 2: Run test to verify it fails**

Run:
- `node --test tests/room-image-policy.test.ts tests/room-image-cleanup.test.ts`

Expected: FAIL after you point imports at the not-yet-created repository/service files.

**Step 3: Write minimal implementation**

- move raw SQL into repository modules
- keep `asset-service.ts` responsible for transactions, cleanup plans, and ownership-scoped orchestration
- keep signed URL shaping inside a presenter/serializer layer
- reduce `lib/server/assets.ts` to a temporary compatibility facade or remove it once all imports are migrated

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/room-image-policy.test.ts tests/room-image-cleanup.test.ts`
- `npx tsc --noEmit`

Expected: PASS

**Step 5: Commit**

```bash
git add lib/server/repositories/furniture-repository.ts lib/server/repositories/room-repository.ts lib/server/repositories/history-repository.ts lib/server/presenters/asset-presenter.ts lib/server/services/asset-service.ts lib/server/assets.ts app/api/catalog/route.ts app/api/catalog/[id]/route.ts app/api/rooms/route.ts app/api/rooms/[id]/route.ts tests/room-image-policy.test.ts tests/room-image-cleanup.test.ts
git commit -m "refactor: split asset repositories and services"
```

### Task 3: Secure the generation flow and remove client-controlled storage fallbacks

**Files:**
- Create: `lib/server/services/generation-service.ts`
- Modify: `app/api/generate/route.ts`
- Modify: `lib/server/gemini.ts`
- Modify: `lib/server/storage.ts`
- Modify: `components/RoomEditor.tsx`
- Test: `tests/generate-access-control.test.ts`
- Test: `tests/generation-access.test.ts`

**Step 1: Write the failing test**

Add tests that prove:
- generation rejects any request that references furniture outside the caller’s owned DB rows
- the public request contract no longer accepts `furnitureFallbacks.storagePath`
- free-limit and VIP-expired checks happen before any Gemini or storage download work starts

**Step 2: Run test to verify it fails**

Run:
- `node --test tests/generate-access-control.test.ts tests/generation-access.test.ts`

Expected: FAIL because the route still accepts client-provided fallback storage paths.

**Step 3: Write minimal implementation**

- make `app/api/generate/route.ts` accept only `roomImageId`, `furnitureItemIds`, and `customInstruction`
- move quota checks and owned-resource loading into `generation-service.ts`
- make `generation-service.ts` fetch owned rows from repositories and pass resolved assets to Gemini
- remove the browser-to-service-role trust jump where the client supplies storage paths
- update `RoomEditor` to stop sending fallback storage metadata

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/generate-access-control.test.ts tests/generation-access.test.ts`
- `npx tsc --noEmit`

Expected: PASS

**Step 5: Commit**

```bash
git add lib/server/services/generation-service.ts app/api/generate/route.ts lib/server/gemini.ts lib/server/storage.ts components/RoomEditor.tsx tests/generate-access-control.test.ts tests/generation-access.test.ts
git commit -m "fix: lock generation flow to owned resources"
```

### Task 4: Internalize history writes and close the public bypass path

**Files:**
- Modify: `app/api/history/route.ts`
- Modify: `lib/server/services/generation-service.ts`
- Modify: `lib/server/repositories/history-repository.ts`
- Test: `tests/history-access-control.test.ts`
- Test: `tests/history-serialization-consistency.test.ts`

**Step 1: Write the failing test**

Add tests that prove:
- public `POST /api/history` cannot bypass quota checks
- history writes only happen through the generation service
- serialization failures do not silently drop rows without an explicit partial-result contract

**Step 2: Run test to verify it fails**

Run:
- `node --test tests/history-access-control.test.ts tests/history-serialization-consistency.test.ts`

Expected: FAIL because `POST /api/history` is still public and serialization still drops failures silently.

**Step 3: Write minimal implementation**

- make `app/api/history/route.ts` GET-only, or gate POST behind the same quota and ownership rules used by generation
- move history persistence behind `generation-service.ts`
- update history list behavior to either fail fast or return an explicit partial-result envelope

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/history-access-control.test.ts tests/history-serialization-consistency.test.ts`
- `npx tsc --noEmit`

Expected: PASS

**Step 5: Commit**

```bash
git add app/api/history/route.ts lib/server/services/generation-service.ts lib/server/repositories/history-repository.ts tests/history-access-control.test.ts tests/history-serialization-consistency.test.ts
git commit -m "refactor: internalize history writes behind generation service"
```

### Task 5: Replace GET-side invite mutation with explicit claim flow

**Files:**
- Create: `app/api/invitations/claim/route.ts`
- Create: `lib/server/services/invite-claim-service.ts`
- Modify: `app/i/[code]/route.ts`
- Modify: `app/api/invitations/signup/route.ts`
- Modify: `lib/server/invitation-service.ts`
- Modify: `lib/server/invitation-store.ts`
- Test: `tests/invite-claim-csrf-boundary.test.ts`
- Test: `tests/invitation-service.test.ts`

**Step 1: Write the failing test**

Add tests that prove:
- `GET /i/[code]` only stores intent/cookie and does not write referral rows
- actual referral claiming requires an explicit POST
- late-claim still respects self-invite and age-window rules

**Step 2: Run test to verify it fails**

Run:
- `node --test tests/invite-claim-csrf-boundary.test.ts tests/invitation-service.test.ts`

Expected: FAIL because GET still mutates referral state.

**Step 3: Write minimal implementation**

- change `app/i/[code]/route.ts` to only validate the code and persist invite intent
- add `app/api/invitations/claim/route.ts` as the only mutation entrypoint
- move claim orchestration into `invite-claim-service.ts`
- keep repository writes in `invitation-store.ts`
- keep signup-time attribution and verified-email finalization behavior intact

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/invite-claim-csrf-boundary.test.ts tests/invitation-service.test.ts`
- `npx tsc --noEmit`

Expected: PASS

**Step 5: Commit**

```bash
git add app/api/invitations/claim/route.ts lib/server/services/invite-claim-service.ts app/i/[code]/route.ts app/api/invitations/signup/route.ts lib/server/invitation-service.ts lib/server/invitation-store.ts tests/invite-claim-csrf-boundary.test.ts tests/invitation-service.test.ts
git commit -m "fix: require explicit invite claim mutation"
```

### Task 6: Remove API-route to server-action coupling for VIP and admin flows

**Files:**
- Create: `lib/server/services/membership-service.ts`
- Create: `lib/server/services/admin-service.ts`
- Modify: `app/actions/user.ts`
- Modify: `app/actions/admin.ts`
- Modify: `app/api/vip/redeem/route.ts`
- Modify: `app/api/admin/codes/generate/route.ts`
- Modify: `app/api/admin/invitations/reset/route.ts`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/invitations/page.tsx`
- Test: `tests/redemption-service.test.ts`
- Test: `tests/admin-service.test.ts`

**Step 1: Write the failing test**

Add tests that lock:
- membership redemption rules live in a reusable service
- admin code generation and invite reset share the same service layer for both route and page entrypoints
- actions become thin wrappers instead of holding business logic

**Step 2: Run test to verify it fails**

Run:
- `node --test tests/redemption-service.test.ts tests/admin-service.test.ts`

Expected: FAIL because the services do not exist and routes still import actions.

**Step 3: Write minimal implementation**

- move redeem logic from `app/actions/user.ts` into `membership-service.ts`
- move admin dashboard/code/reset logic from `app/actions/admin.ts` into `admin-service.ts`
- update routes and actions to call the same services
- keep page-level server components using actions only where they need a React server entrypoint

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/redemption-service.test.ts tests/admin-service.test.ts`
- `npx tsc --noEmit`

Expected: PASS

**Step 5: Commit**

```bash
git add lib/server/services/membership-service.ts lib/server/services/admin-service.ts app/actions/user.ts app/actions/admin.ts app/api/vip/redeem/route.ts app/api/admin/codes/generate/route.ts app/api/admin/invitations/reset/route.ts app/admin/page.tsx app/admin/invitations/page.tsx tests/redemption-service.test.ts tests/admin-service.test.ts
git commit -m "refactor: share membership and admin services across actions and routes"
```

### Task 7: Remove runtime DDL and make schema compatibility explicit

**Files:**
- Modify: `lib/server/assets.ts`
- Modify: `lib/server/generation-history-schema.ts`
- Modify: `scripts/migrate-storage-assets.mjs`
- Modify: `package.json`
- Test: `tests/generation-history-schema.test.ts`

**Step 1: Write the failing test**

Add a test that asserts missing history-selection columns cause a controlled migration-required failure instead of issuing DDL at request time.

**Step 2: Run test to verify it fails**

Run:
- `node --test tests/generation-history-schema.test.ts`

Expected: FAIL because the request path still contains runtime `ALTER TABLE` fallback behavior.

**Step 3: Write minimal implementation**

- remove `ensureGenerationHistorySelectionColumns()` and the request-time `ALTER TABLE` path
- make the schema helper fail fast with a clear migration-required error
- update migration scripts to create the required columns explicitly
- document the migration command in `package.json` or the existing migration script comments

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/generation-history-schema.test.ts`
- `npx tsc --noEmit`

Expected: PASS

**Step 5: Commit**

```bash
git add lib/server/assets.ts lib/server/generation-history-schema.ts scripts/migrate-storage-assets.mjs package.json tests/generation-history-schema.test.ts
git commit -m "refactor: remove runtime ddl from request paths"
```

### Task 8: Split `Dashboard` into domain tabs and remove shared upload state coupling

**Files:**
- Create: `components/dashboard/CatalogTab.tsx`
- Create: `components/dashboard/EditorTab.tsx`
- Create: `components/dashboard/InviteTab.tsx`
- Create: `components/dashboard/VipTab.tsx`
- Modify: `components/Dashboard.tsx`
- Modify: `components/Catalog.tsx`
- Modify: `components/RoomEditor.tsx`
- Test: `tests/client-boundaries.test.ts`
- Test: `tests/file-input-event.test.ts`

**Step 1: Write the failing test**

Add or update tests that lock:
- client mutation components still do not import `app/actions`
- room editor no longer depends on `Dashboard`’s shared furniture-upload callback to own its upload state

**Step 2: Run test to verify it fails**

Run:
- `node --test tests/client-boundaries.test.ts tests/file-input-event.test.ts`

Expected: FAIL after you switch imports to the new domain tabs/hooks that do not exist yet.

**Step 3: Write minimal implementation**

- make `Dashboard.tsx` a shell that only controls tab selection and shared user-level UI
- move catalog data flow into `CatalogTab.tsx`
- move room editor state and owned API calls into `EditorTab.tsx`
- keep invite and VIP flows isolated from catalog/editor state

**Step 4: Run test to verify it passes**

Run:
- `node --test tests/client-boundaries.test.ts tests/file-input-event.test.ts`
- `npx tsc --noEmit`

Expected: PASS

**Step 5: Commit**

```bash
git add components/dashboard/CatalogTab.tsx components/dashboard/EditorTab.tsx components/dashboard/InviteTab.tsx components/dashboard/VipTab.tsx components/Dashboard.tsx components/Catalog.tsx components/RoomEditor.tsx tests/client-boundaries.test.ts tests/file-input-event.test.ts
git commit -m "refactor: split dashboard into domain tabs"
```

## Suggested Schedule

### Week 1: Security and boundary repair

- Task 1
- Task 3
- Task 4
- Task 7

**Week 1 exit criteria**
- no client-controlled storage paths in public APIs
- no GET-side referral mutation
- no runtime DDL on request paths
- all touched APIs use the same validation and error envelope

### Week 2: Structural cleanup

- Task 2
- Task 5
- Task 6
- Task 8

**Week 2 exit criteria**
- no API route imports a server action
- `lib/server/assets.ts` is no longer the business-logic dumping ground
- `Dashboard.tsx` is a shell instead of a multi-domain state manager
- service and repository modules are independently testable

## Final Verification Checklist

Run after the last task:

```bash
node --test tests/*.test.ts tests/*.test.mjs
npx tsc --noEmit
npm run lint
```

Manual verification:
- upload furniture
- upload room image
- generate room visualization
- open history
- redeem VIP code
- view invite center
- follow invite link as logged-out user
- follow invite link as logged-in user
- run admin code generation
- run admin invite reset
