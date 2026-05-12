'use server';

import { headers } from 'next/headers';
import { db, query } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { getShanghaiDayRange, isAdminRole } from '@/app/admin/admin-shared';
import { generateRedemptionCode } from '@/lib/redemption-codes';
import { generateInviteCode } from '@/lib/invitations';
import { getSiteBaseUrl } from '@/lib/site-url';
import { getAdminInvitationSummary as getAdminInvitationSummaryFromStore, withInvitationTransaction } from '@/lib/server/invitation-store';
import { rotateInviteLinkForUser } from '@/lib/server/invitation-service';

/**
 * 校验管理员权限
 */
async function checkAdmin(): Promise<void> {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.user.role)) {
    throw new Error('Unauthorized');
  }
}

/**
 * 获取所有兑换码
 */
export async function getRedemptionCodes(): Promise<Array<Record<string, any>>> {
  await checkAdmin();

  const { rows } = await query(
    `
      SELECT c.*, u.name as user_name, u.email as user_email
      FROM redemption_codes c
      LEFT JOIN "user" u ON c.used_by = u.id
      ORDER BY c.created_at DESC
    `
  );

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    days: row.days,
    status: row.status,
    usedBy: row.used_by,
    userName: row.user_name,
    userEmail: row.user_email,
    createdAt: row.created_at,
    usedAt: row.used_at,
  }));
}

/**
 * 批量生成兑换码
 */
export async function generateCodes(count: number, days: number): Promise<Array<Record<string, any>>> {
  await checkAdmin();

  if (count <= 0 || days <= 0 || count > 100) {
    throw new Error('Invalid parameters');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const codes = [];
    for (let i = 0; i < count; i++) {
      let createdCode = false;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateRedemptionCode();

        try {
          const insertQuery = `
            INSERT INTO redemption_codes (code, days)
            VALUES ($1, $2)
            RETURNING *
          `;
          const res = await client.query(insertQuery, [code, days]);
          codes.push(res.rows[0]);
          createdCode = true;
          break;
        } catch (err: any) {
          if (err?.code !== '23505') {
            throw err;
          }
        }
      }

      if (!createdCode) {
        throw new Error('Failed to generate a unique redemption code');
      }
    }

    await client.query('COMMIT');
    return codes.map(row => ({
      id: row.id,
      code: row.code,
      days: row.days,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error('Failed to generate codes');
  } finally {
    client.release();
  }
}

/**
 * 获取仪表盘统计数据
 */
export async function getDashboardStats() {
  await checkAdmin();
  const { start: todayStart, end: todayEnd } = getShanghaiDayRange();

  // 总用户数
  const totalUsersResult = await query('SELECT COUNT(*) FROM "user"');
  const totalUsers = parseInt(totalUsersResult.rows[0].count, 10);

  // 今日新增用户
  const newUsersResult = await query(`
    SELECT COUNT(*) FROM "user" 
    WHERE "createdAt" >= $1 AND "createdAt" < $2
  `, [todayStart, todayEnd]);
  const newUsers = parseInt(newUsersResult.rows[0].count, 10);

  // 日活 (DAU) - 过去 24 小时内有 session 活动的用户数
  const dauResult = await query(`
    SELECT COUNT(DISTINCT "userId") FROM "session" 
    WHERE "updatedAt" >= NOW() - INTERVAL '24 hours'
  `);
  const dau = parseInt(dauResult.rows[0].count, 10);

  // 总生成数
  const totalGenerationsResult = await query('SELECT COUNT(*) FROM "generation_history"');
  const totalGenerations = parseInt(totalGenerationsResult.rows[0].count, 10);

  return {
    totalUsers,
    newUsers,
    dau,
    totalGenerations,
  };
}

export async function getAdminInvitationSummary() {
  await checkAdmin();
  return getAdminInvitationSummaryFromStore();
}

export async function forceResetInviteLinkForUser(targetUserId: string) {
  await checkAdmin();
  const session = await getServerSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  const baseUrl = getSiteBaseUrl({
    requestHeaders: await headers(),
  });

  return withInvitationTransaction(async (repo) => {
    return rotateInviteLinkForUser({
      repo,
      targetUserId,
      rotatedByUserId: session.user.id,
      rotationReason: 'admin_reset',
      baseUrl,
      now: new Date(),
      codeGenerator: generateInviteCode,
    });
  });
}

/**
 * 获取过去 N 天的每日趋势：注册数 + 生成数
 *
 * 实现说明：使用 generate_series + 左连接 GROUP BY 保证空白日期也会出现，
 * 时区固定为 Asia/Shanghai（与现有 getShanghaiDayRange 一致）。
 */
export async function getDashboardTrends(days = 30) {
  await checkAdmin();

  const safeDays = Math.max(1, Math.min(90, Math.floor(days) || 30));

  const { rows } = await query(
    `
      WITH date_series AS (
        SELECT generate_series(
          (NOW() AT TIME ZONE 'Asia/Shanghai')::date - ($1::int - 1),
          (NOW() AT TIME ZONE 'Asia/Shanghai')::date,
          INTERVAL '1 day'
        )::date AS day
      ),
      registrations AS (
        -- user."createdAt" is better-auth's timestamp without time zone (UTC-encoded),
        -- so we anchor as UTC first, then shift to Shanghai before bucketing by date.
        SELECT
          ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai')::date) AS day,
          COUNT(*)::int AS count
        FROM "user"
        WHERE "createdAt" >= (NOW() - ($1::int || ' days')::interval)
        GROUP BY 1
      ),
      generations AS (
        -- generation_history.created_at is timestamptz, so a single AT TIME ZONE shifts correctly.
        SELECT
          ((created_at AT TIME ZONE 'Asia/Shanghai')::date) AS day,
          COUNT(*)::int AS count
        FROM generation_history
        WHERE created_at >= (NOW() - ($1::int || ' days')::interval)
        GROUP BY 1
      )
      SELECT
        to_char(ds.day, 'YYYY-MM-DD') AS day,
        COALESCE(r.count, 0)::int AS registrations,
        COALESCE(g.count, 0)::int AS generations
      FROM date_series ds
      LEFT JOIN registrations r ON r.day = ds.day
      LEFT JOIN generations g ON g.day = ds.day
      ORDER BY ds.day ASC
    `,
    [safeDays]
  );

  return rows.map((row) => ({
    day: String(row.day),
    registrations: Number(row.registrations) || 0,
    generations: Number(row.generations) || 0,
  }));
}

/**
 * VIP / 用户构成统计
 */
export async function getVipStats() {
  await checkAdmin();

  const { rows } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE "vipExpiresAt" IS NOT NULL AND "vipExpiresAt" > NOW())::int AS active_vip,
      COUNT(*) FILTER (WHERE "vipExpiresAt" IS NOT NULL AND "vipExpiresAt" <= NOW())::int AS expired_vip,
      COUNT(*) FILTER (WHERE "vipExpiresAt" IS NULL)::int AS non_vip,
      COUNT(*) FILTER (WHERE "emailVerified" = true)::int AS verified_users,
      COUNT(*) FILTER (WHERE "emailVerified" IS NOT TRUE)::int AS unverified_users
    FROM "user"
  `);

  const row = rows[0] ?? {};
  return {
    activeVip: Number(row.active_vip) || 0,
    expiredVip: Number(row.expired_vip) || 0,
    nonVip: Number(row.non_vip) || 0,
    verifiedUsers: Number(row.verified_users) || 0,
    unverifiedUsers: Number(row.unverified_users) || 0,
  };
}

/**
 * 兑换码统计
 */
export async function getRedemptionStats() {
  await checkAdmin();

  const { rows: totalsRows } = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'used')::int AS used,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE status NOT IN ('used', 'active'))::int AS other,
      COUNT(*) FILTER (
        WHERE status = 'used'
          AND used_at IS NOT NULL
          AND used_at >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai'
      )::int AS used_this_month,
      COUNT(*) FILTER (
        WHERE status = 'used'
          AND used_at IS NOT NULL
          AND used_at >= NOW() - INTERVAL '7 days'
      )::int AS used_last_7d
    FROM redemption_codes
  `);

  const { rows: byDaysRows } = await query(`
    SELECT
      days,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'used')::int AS used
    FROM redemption_codes
    GROUP BY days
    ORDER BY days ASC
  `);

  const totals = totalsRows[0] ?? {};
  return {
    total: Number(totals.total) || 0,
    used: Number(totals.used) || 0,
    active: Number(totals.active) || 0,
    other: Number(totals.other) || 0,
    usedThisMonth: Number(totals.used_this_month) || 0,
    usedLast7d: Number(totals.used_last_7d) || 0,
    byDays: byDaysRows.map((row) => ({
      days: Number(row.days) || 0,
      total: Number(row.total) || 0,
      used: Number(row.used) || 0,
    })),
  };
}

/**
 * 本月生成数最多的用户 Top N
 */
export async function getGenerationLeaderboard(limit = 10) {
  await checkAdmin();

  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit) || 10));

  const { rows } = await query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u."vipExpiresAt",
        COUNT(g.id)::int AS generation_count
      FROM "user" u
      INNER JOIN generation_history g ON g.user_id = u.id
      WHERE g.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY u.id, u.name, u.email, u."vipExpiresAt"
      ORDER BY generation_count DESC, u."createdAt" DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return rows.map((row) => ({
    id: String(row.id),
    name: row.name ?? null,
    email: row.email ?? null,
    vipExpiresAt: row.vipExpiresAt ?? null,
    generationCount: Number(row.generation_count) || 0,
  }));
}

/**
 * 生成成功率统计
 *
 * 成功来源：generation_history（每条记录代表一次成功生成）
 * 失败来源：generation_failures（路由层的失败采集表）
 *
 * 关键风险点：generation_failures 表可能尚未迁移，因此 failures 部分单独 try-catch，
 * 失败时返回 0 而不是整体抛错。
 */
export async function getGenerationSuccessStats(days = 30) {
  await checkAdmin();

  const safeDays = Math.max(1, Math.min(90, Math.floor(days) || 30));

  const successResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM generation_history
      WHERE created_at >= NOW() - ($1::int || ' days')::interval
    `,
    [safeDays]
  );

  const totalSuccess = Number(successResult.rows[0]?.total) || 0;

  let totalFailure = 0;
  let byErrorCode: Array<{ errorCode: string | null; count: number }> = [];

  try {
    const failureResult = await query(
      `
        SELECT COUNT(*)::int AS total
        FROM generation_failures
        WHERE created_at >= NOW() - ($1::int || ' days')::interval
      `,
      [safeDays]
    );
    totalFailure = Number(failureResult.rows[0]?.total) || 0;

    const byCodeResult = await query(
      `
        SELECT error_code, COUNT(*)::int AS count
        FROM generation_failures
        WHERE created_at >= NOW() - ($1::int || ' days')::interval
        GROUP BY error_code
        ORDER BY count DESC
        LIMIT 8
      `,
      [safeDays]
    );

    byErrorCode = byCodeResult.rows.map((row) => ({
      errorCode: row.error_code ?? null,
      count: Number(row.count) || 0,
    }));
  } catch (err) {
    // 表不存在或暂时不可用 —— 静默降级（已在迁移说明中提示运行 generation-telemetry:migrate）
    if (!(err && typeof err === 'object' && (err as { code?: string }).code === '42P01')) {
      console.error('[getGenerationSuccessStats] failure data unavailable:', err);
    }
  }

  const total = totalSuccess + totalFailure;
  const successRate = total > 0 ? Math.round((totalSuccess / total) * 10000) / 100 : null;

  return {
    days: safeDays,
    totalSuccess,
    totalFailure,
    total,
    successRate,
    byErrorCode,
  };
}

/**
 * 周留存矩阵
 *
 * 「活跃」定义为该周内至少有一次成功生成（generation_history）
 * 时区固定为 Asia/Shanghai；列类型通过 ::timestamptz 强转后再 AT TIME ZONE 转换，
 * 兼容 timestamp 和 timestamptz 两种列类型。
 */
export async function getCohortRetention(weeks = 8) {
  await checkAdmin();

  const safeWeeks = Math.max(1, Math.min(26, Math.floor(weeks) || 8));

  const { rows } = await query(
    `
      -- user."createdAt" (timestamp without tz, UTC-encoded) requires explicit UTC anchor;
      -- generation_history.created_at (timestamptz) only needs the target-zone shift.
      WITH cohorts AS (
        SELECT
          id AS user_id,
          date_trunc(
            'week',
            (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai')
          )::date AS cohort_week
        FROM "user"
        WHERE "createdAt" >= NOW() - ($1::int || ' weeks')::interval
      ),
      cohort_sizes AS (
        SELECT cohort_week, COUNT(*)::int AS size
        FROM cohorts
        GROUP BY cohort_week
      ),
      activity AS (
        SELECT DISTINCT
          g.user_id,
          date_trunc(
            'week',
            (g.created_at AT TIME ZONE 'Asia/Shanghai')
          )::date AS active_week
        FROM generation_history g
        WHERE g.created_at >= NOW() - ($1::int || ' weeks')::interval
      ),
      retention AS (
        SELECT
          c.cohort_week,
          ((a.active_week - c.cohort_week) / 7)::int AS week_offset,
          COUNT(DISTINCT c.user_id)::int AS retained
        FROM cohorts c
        INNER JOIN activity a
          ON a.user_id = c.user_id
          AND a.active_week >= c.cohort_week
        GROUP BY c.cohort_week, ((a.active_week - c.cohort_week) / 7)
      )
      SELECT
        to_char(cs.cohort_week, 'YYYY-MM-DD') AS cohort_week,
        cs.size,
        r.week_offset,
        COALESCE(r.retained, 0)::int AS retained
      FROM cohort_sizes cs
      LEFT JOIN retention r ON r.cohort_week = cs.cohort_week
      ORDER BY cs.cohort_week DESC, r.week_offset ASC NULLS FIRST
    `,
    [safeWeeks]
  );

  const cohortMap = new Map<string, { cohortWeek: string; size: number; retainedByOffset: Map<number, number> }>();

  for (const row of rows) {
    const cohortWeek = String(row.cohort_week);
    const existing =
      cohortMap.get(cohortWeek) ?? {
        cohortWeek,
        size: Number(row.size) || 0,
        retainedByOffset: new Map<number, number>(),
      };

    if (row.week_offset != null) {
      existing.retainedByOffset.set(Number(row.week_offset), Number(row.retained) || 0);
    }

    cohortMap.set(cohortWeek, existing);
  }

  const cohorts = Array.from(cohortMap.values()).map((c) => {
    const offsets: Array<{ weekOffset: number; retained: number; rate: number | null }> = [];
    for (let i = 0; i < safeWeeks; i += 1) {
      const retained = c.retainedByOffset.get(i) ?? 0;
      const rate = c.size > 0 ? Math.round((retained / c.size) * 100) : null;
      offsets.push({ weekOffset: i, retained, rate });
    }
    return {
      cohortWeek: c.cohortWeek,
      size: c.size,
      offsets,
    };
  });

  return {
    weeks: safeWeeks,
    cohorts,
  };
}

/**
 * 获取用户列表
 */
export async function getUsersList(limit = 50, offset = 0) {
  await checkAdmin();

  const { rows } = await query(`
    SELECT 
      u.id, 
      u.name, 
      u.email, 
      u."emailVerified",
      u.role, 
      u."createdAt", 
      u."vipExpiresAt",
      (SELECT COUNT(*) FROM "generation_history" g WHERE g.user_id = u.id) as generation_count,
      (SELECT MAX("updatedAt") FROM "session" s WHERE s."userId" = u.id) as last_login
    FROM "user" u
    ORDER BY u."createdAt" DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    role: row.role,
    createdAt: row.createdAt,
    vipExpiresAt: row.vipExpiresAt,
    generationCount: parseInt(row.generation_count || '0', 10),
    lastLogin: row.last_login,
  }));
}
