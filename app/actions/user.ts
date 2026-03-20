'use server';

import { db } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { normalizeRedemptionCodeInput } from '@/lib/redemption-codes';

/**
 * 兑换 VIP 卡密
 */
export async function redeemCode(code: string): Promise<{ success: boolean; message: string }> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  const userId = session.user.id;
  const normalizedCode = normalizeRedemptionCodeInput(code);
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. 获取兑换码信息并锁定对应的行
    const codeQuery = await client.query(
      `SELECT * FROM redemption_codes WHERE code = $1 AND status = 'active' FOR UPDATE`,
      [normalizedCode]
    );

    if (codeQuery.rows.length === 0) {
      throw new Error('无效的兑换码或已被使用');
    }

    const redemptionCode = codeQuery.rows[0];
    const daysToAdd = redemptionCode.days;

    // 2. 更新兑换码状态
    await client.query(
      `UPDATE redemption_codes 
       SET status = 'used', used_by = $1, used_at = NOW() 
       WHERE id = $2`,
      [userId, redemptionCode.id]
    );

    // 3. 锁定对应用户的行，获取当前的过期时间
    const userQuery = await client.query(
      `SELECT "vipExpiresAt" FROM "user" WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (userQuery.rows.length === 0) {
      throw new Error('用户不存在');
    }

    const currentVipExpiresAt = userQuery.rows[0].vipExpiresAt;
    const now = new Date();
    
    const isVipActive = currentVipExpiresAt && currentVipExpiresAt > now;
    const baseDate = isVipActive ? currentVipExpiresAt : now;
    const newExpiresAt = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    // 4. 更新用户的过期时间
    await client.query(
      `UPDATE "user" SET "vipExpiresAt" = $1 WHERE id = $2`,
      [newExpiresAt, userId]
    );

    await client.query('COMMIT');
    
    return { success: true, message: `成功兑换 ${daysToAdd} 天，新的到期时间为 ${newExpiresAt.toLocaleDateString()}` };
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw new Error(err.message || '兑换失败，请稍后重试');
  } finally {
    client.release();
  }
}
