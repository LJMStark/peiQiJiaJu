# syntax=docker/dockerfile:1
#
# Multi-stage build. next.config.ts already sets output: 'standalone'; the
# runtime image now only carries that output (server.js + traced
# dependencies, including sharp) plus .next/static and public, instead of the
# full node_modules tree, .next/cache and the source checkout.
#
# The runner lays out .next/static and public next to server.js at build
# time, which is what scripts/start-next.mjs used to do on every start.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
# Zeabur only passes service variables into a multi-stage build for declared
# ARGs. next.config.ts derives the allowed image hosts from
# NEXT_PUBLIC_SUPABASE_URL / DIRECT_URL / R2_PUBLIC_URL, and NEXT_PUBLIC_*
# values are inlined into client bundles, so declare everything the app reads.
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_GEMINI_IMAGE_MODEL
ARG NEXT_PUBLIC_GEMINI_CLASSIFIER_MODEL
ARG APP_URL
ARG DATABASE_URL
ARG DIRECT_URL
ARG BETTER_AUTH_SECRET
ARG R2_PUBLIC_URL
ARG R2_ACCOUNT_ID
ARG R2_ACCESS_KEY_ID
ARG R2_SECRET_ACCESS_KEY
ARG R2_BUCKET_NAME
ARG RESEND_API_KEY
ARG EMAIL_FROM
ARG GEMINI_API_KEY
ARG DUOMI_API
ARG DUOMI_API_BASE
ARG DUOMI_IMAGE_MODEL
ARG SUPABASE_SERVICE_ROLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 8080
# Kubernetes sets HOSTNAME to the pod name and server.js binds to HOSTNAME,
# so pin it to all interfaces.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
