'use server';

import { db, query } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

/**
 * 校验管理员权限
 */
async function checkAdmin(): Promise<void> {
  const session = await getServerSession();
  if (!session || session.user.role !== 'admin') {
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
