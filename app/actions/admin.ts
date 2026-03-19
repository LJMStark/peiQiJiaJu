'use server';

import { db, query } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { getShanghaiDayRange, isAdminRole } from '@/app/admin/admin-shared';

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
 * 内部辅助函数：生成随机兑换码
 */
function generateRandomCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase() + 
         Math.random().toString(36).substring(2, 10).toUpperCase();
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
      let code = generateRandomCode();
      const insertQuery = `
        INSERT INTO redemption_codes (code, days)
        VALUES ($1, $2)
        RETURNING *
      `;
      const res = await client.query(insertQuery, [code, days]);
      codes.push(res.rows[0]);
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
    role: row.role,
    createdAt: row.createdAt,
    vipExpiresAt: row.vipExpiresAt,
    generationCount: parseInt(row.generation_count || '0', 10),
    lastLogin: row.last_login,
  }));
}
