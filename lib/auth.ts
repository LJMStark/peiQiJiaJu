import 'server-only';

import { betterAuth } from 'better-auth';
import { headers } from 'next/headers';
import { cache } from 'react';
import { Pool } from 'pg';
import { sendEmail } from './send-email';

type AuthConfigOptions = {
  preferDirect?: boolean;
};

const globalForAuth = globalThis as typeof globalThis & {
  __betterAuthPools?: Map<string, Pool>;
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

  const existingPool = pools.get(connectionString);
  if (existingPool) {
    return existingPool;
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
  });

  pools.set(connectionString, pool);
  return pool;
}

export function createAuth(config: AuthConfigOptions = {}) {
  return betterAuth({
    baseURL: getBaseUrl(),
    secret: getAuthSecret(),
    database: getPool(getConnectionString(config)),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        void sendEmail({
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
    },
  });
}

export const auth = createAuth();

export const getServerSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});
