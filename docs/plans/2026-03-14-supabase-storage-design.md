# Supabase Storage Integration Design

**Date:** 2026-03-14

## Goal

Replace the current in-memory/base64 image workflow with a production-ready persistence model:

- furniture images live in Supabase Storage
- room images live in Supabase Storage
- generated result images live in Supabase Storage
- all metadata and user ownership live in Supabase Postgres

This keeps Better Auth as the application auth layer and uses server-side Supabase Storage access for file operations.

## Approved Direction

The user approved a single-provider asset strategy:

- use Supabase Storage instead of Vercel Blob
- keep using Better Auth for email/password auth
- prepare the project for a later Pro upgrade

## Architecture

### Auth

- Better Auth remains the only end-user authentication system.
- All file operations go through authenticated Next.js route handlers.
- Supabase Storage is accessed server-side with the service role key, never from public client code.

### Storage

Use private buckets:

- `furniture-assets`
- `room-assets`
- `generated-assets`

Private buckets are important because room photos and generated interiors are user content and should not become publicly enumerable.

### Database

Add application tables keyed to the Better Auth user id:

- `furniture_items`
- `room_images`
- `generation_history`

Each row stores:

- owning `user_id`
- storage object path
- mime type
- size
- display name or prompt metadata
- timestamps

Generated history rows also link the source room and furniture rows when available.

### API shape

Use authenticated route handlers for CRUD and upload flows:

- `GET/POST /api/catalog`
- `PATCH/DELETE /api/catalog/[id]`
- `GET/POST /api/rooms`
- `DELETE /api/rooms/[id]`
- `GET/POST /api/history`

Each GET response returns fresh signed URLs for rendering.

### Frontend flow

- Dashboard bootstraps catalog, room images, and generation history from the API.
- Uploads send files to the server, which stores them in Supabase and inserts metadata rows.
- The Gemini workflow remains client-side for now because the app already depends on the AI Studio browser key flow.
- When Gemini returns a generated image, the client sends that result to the server, which uploads it to Supabase Storage and records the history row.

## Data shape changes

The current `FurnitureItem` shape uses `data` as inline base64. That will be replaced with stored asset metadata:

- `storagePath`
- `imageUrl`
- `mimeType`
- `fileSize`

Room and history records will follow the same pattern.

## Security

- No hardcoded keys
- Storage access only on the server with `SUPABASE_SERVICE_ROLE_KEY`
- File uploads validated by mime type and size
- Route handlers require a Better Auth session before reading or mutating user assets
- Signed URLs are short-lived and issued per request

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Already present and still required:

- `DATABASE_URL`
- `DIRECT_URL`
- `BETTER_AUTH_SECRET`
- `NEXT_PUBLIC_BASE_URL`

## Known Constraint

The current workspace does not yet have a `SUPABASE_SERVICE_ROLE_KEY`, so runtime Storage verification is blocked until the user provides it.
