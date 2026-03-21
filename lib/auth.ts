import 'server-only';

import { betterAuth } from 'better-auth';
import { headers } from 'next/headers';
import { cache } from 'react';
import { Pool } from 'pg';
import { shouldIgnorePgPoolError } from './db-error';
import { sendEmail } from './send-email';
import { readInviteCodeFromCookieHeader } from './invitations';
import { withInvitationTransaction } from './server/invitation-store';
import { finalizeInviteAfterVerification } from './server/invitation-service';

type AuthConfigOptions = {
  preferDirect?: boolean;
};

const globalForAuth = globalThis as typeof globalThis & {
  __betterAuthPools?: Map<string, Pool>;
  __betterAuthPoolErrorHandlersRegistered?: Set<string>;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
}

function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'development-only-secret-change-me-before-production';
  }

  throw new Error('BETTER_AUTH_SECRET is not set.');
}

function getConnectionString({ preferDirect = false }: AuthConfigOptions = {}) {
  if (preferDirect && process.env.DIRECT_URL) {
    return process.env.DIRECT_URL;
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.DIRECT_URL) {
    return process.env.DIRECT_URL;
  }

  throw new Error('DATABASE_URL is not set. Add DATABASE_URL or DIRECT_URL to your .env file.');
}

function getPool(connectionString: string) {
  const pools = globalForAuth.__betterAuthPools ?? new Map<string, Pool>();
  globalForAuth.__betterAuthPools = pools;
  const registeredHandlers =
    globalForAuth.__betterAuthPoolErrorHandlersRegistered ?? new Set<string>();
  globalForAuth.__betterAuthPoolErrorHandlersRegistered = registeredHandlers;

  let pool = pools.get(connectionString);
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
    });
    pools.set(connectionString, pool);
  }

  if (!registeredHandlers.has(connectionString)) {
    const handlePoolError = (error: unknown) => {
      if (shouldIgnorePgPoolError(error)) {
        return;
      }

      console.error('Unexpected auth Postgres pool error:', error);
    };

    pool.on('error', handlePoolError);
    pool.on('connect', (client) => {
      client.on('error', handlePoolError);
    });
    registeredHandlers.add(connectionString);
  }

  return pool;
}

/**
 * 每个用户允许的最大并发登录设备数。
 * 超出限制时，最旧的 session 会被自动踢掉。
 */
const MAX_CONCURRENT_SESSIONS = 2;

export function createAuth(config: AuthConfigOptions = {}) {
  const pool = getPool(getConnectionString(config));

  return betterAuth({
    baseURL: getBaseUrl(),
    trustedOrigins: process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'] : undefined,
    secret: getAuthSecret(),
    database: pool,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: process.env.NODE_ENV === 'production',
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: '佩奇家具 - 重置您的密码',
          html: [
            `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">`,
            `<h2 style="color: #18181b; margin-bottom: 16px;">重置您的密码</h2>`,
            `<p style="color: #52525b; line-height: 1.6;">您好${user.name ? ` ${user.name}` : ''}，</p>`,
            `<p style="color: #52525b; line-height: 1.6;">您请求重置佩奇家具的登录密码。请点击下方按钮设置新密码：</p>`,
            `<a href="${url}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">重置密码</a>`,
            `<p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">此链接 1 小时内有效。如果您并未请求重置密码，请原样忽略此邮件。</p>`,
            `<hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />`,
            `<p style="color: #a1a1aa; font-size: 12px;">如果按钮无法点击，请复制以下链接到浏览器：<br />${url}</p>`,
            `</div>`,
          ].join('\n'),
        });
      },
    },
    user: {
      additionalFields: {
        role: {
          type: 'string',
          defaultValue: 'user',
          input: false,
        },
        vipExpiresAt: {
          type: 'date',
          required: false,
          input: false,
        },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            try {
              const { rows } = await pool.query(
                `SELECT id FROM "session" WHERE "userId" = $1 ORDER BY "createdAt" ASC`,
                [session.userId]
              );

              if (rows.length >= MAX_CONCURRENT_SESSIONS) {
                // 删除最旧的 session，为新 session 腾位置
                const excessCount = rows.length - MAX_CONCURRENT_SESSIONS + 1;
                const idsToDelete = rows.slice(0, excessCount).map((r: { id: string }) => r.id);
                await pool.query(
                  `DELETE FROM "session" WHERE id = ANY($1)`,
                  [idsToDelete]
                );
                console.log(
                  `[auth] 用户 ${session.userId} 超出并发限制(${MAX_CONCURRENT_SESSIONS})，已踢掉 ${idsToDelete.length} 个旧会话`
                );
              }
            } catch (err) {
              // 钩子失败不应阻止登录
              console.error('[auth] 并发会话检查失败:', err);
            }

            return { data: session };
          },
        },
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: '佩奇家具 - 验证您的邮箱',
          html: [
            `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">`,
            `<h2 style="color: #18181b; margin-bottom: 16px;">验证您的邮箱地址</h2>`,
            `<p style="color: #52525b; line-height: 1.6;">您好${user.name ? ` ${user.name}` : ''}，</p>`,
            `<p style="color: #52525b; line-height: 1.6;">感谢您注册佩奇家具。请点击下方按钮验证您的邮箱地址：</p>`,
            `<a href="${url}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">验证邮箱</a>`,
            `<p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">此链接 1 小时内有效。如果您未注册佩奇家具，请忽略此邮件。</p>`,
            `<hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />`,
            `<p style="color: #a1a1aa; font-size: 12px;">如果按钮无法点击，请复制以下链接到浏览器：<br />${url}</p>`,
            `</div>`,
          ].join('\n'),
        });
      },
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 3600,
      afterEmailVerification: async (user, request) => {
        const fallbackInviteCode = readInviteCodeFromCookieHeader(request?.headers.get('cookie'));

        try {
          await withInvitationTransaction(async (repo) => {
            await finalizeInviteAfterVerification({
              repo,
              inviteeUserId: user.id,
              fallbackInviteCode,
              now: new Date(),
            });
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to finalize invitation attribution.';
          console.error('[invitation] failed to finalize verification attribution:', message);
        }
      },
    },
  });
}

export const auth = createAuth();
export type AppSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export function isSessionEmailVerified(
  session: AppSession | null | undefined
): boolean {
  if (!session) return false;
  // 在开发环境下，如果没验证过邮箱也放行
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  return Boolean(session.user.emailVerified);
}

export const getServerSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});
