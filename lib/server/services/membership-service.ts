import { formatBeijingDate } from '../../beijing-time.ts';
import { normalizeRedemptionCodeInput } from '../../redemption-codes.ts';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type MembershipRedemptionResult = {
  success: boolean;
  message: string;
};

type ActiveRedemptionCode = {
  id: string;
  days: number;
};

type VipExpiryValue = Date | string | null | undefined;

export type MembershipServiceDeps = {
  begin: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  findActiveCode: (normalizedCode: string) => Promise<ActiveRedemptionCode | null>;
  markCodeUsed: (codeId: string, userId: string) => Promise<void>;
  findUserVipExpiry: (userId: string) => Promise<VipExpiryValue>;
  updateUserVipExpiry: (userId: string, vipExpiresAt: Date) => Promise<void>;
  formatDate: (date: Date) => string;
  release?: () => void;
};

export type RedeemMembershipCodeInput = {
  userId: string;
  code: string;
  now?: Date;
};

type RedemptionCodeRow = {
  id: string;
  days: number;
};

type UserVipExpiryRow = {
  vipExpiresAt: Date | string | null;
};

function normalizeVipExpiry(value: VipExpiryValue) {
  if (value === undefined || value === null) {
    return value;
  }

  return value instanceof Date ? value : new Date(value);
}

async function createDefaultMembershipServiceDeps(): Promise<MembershipServiceDeps> {
  const [{ db }] = await Promise.all([
    import('../../db.ts'),
  ]);
  const client = await db.connect();

  return {
    async begin() {
      await client.query('BEGIN');
    },
    async commit() {
      await client.query('COMMIT');
    },
    async rollback() {
      await client.query('ROLLBACK');
    },
    async findActiveCode(normalizedCode) {
      const result = await client.query<RedemptionCodeRow>(
        `SELECT id, days
         FROM redemption_codes
         WHERE code = $1 AND status = 'active'
         FOR UPDATE`,
        [normalizedCode]
      );

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        days: row.days,
      };
    },
    async markCodeUsed(codeId, userId) {
      await client.query(
        `UPDATE redemption_codes
         SET status = 'used', used_by = $1, used_at = NOW()
         WHERE id = $2`,
        [userId, codeId]
      );
    },
    async findUserVipExpiry(userId) {
      const result = await client.query<UserVipExpiryRow>(
        `SELECT "vipExpiresAt"
         FROM "user"
         WHERE id = $1
         FOR UPDATE`,
        [userId]
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      return result.rows[0].vipExpiresAt;
    },
    async updateUserVipExpiry(userId, vipExpiresAt) {
      await client.query(
        `UPDATE "user" SET "vipExpiresAt" = $1 WHERE id = $2`,
        [vipExpiresAt, userId]
      );
    },
    formatDate(date) {
      return formatBeijingDate(date);
    },
    release() {
      client.release();
    },
  };
}

export async function redeemMembershipCode(
  input: RedeemMembershipCodeInput,
  deps?: MembershipServiceDeps
): Promise<MembershipRedemptionResult> {
  const resolvedDeps = deps ?? await createDefaultMembershipServiceDeps();
  const normalizedCode = normalizeRedemptionCodeInput(input.code);
  const now = input.now ?? new Date();

  try {
    await resolvedDeps.begin();

    const redemptionCode = await resolvedDeps.findActiveCode(normalizedCode);
    if (!redemptionCode) {
      throw new Error('无效的兑换码或已被使用');
    }

    await resolvedDeps.markCodeUsed(redemptionCode.id, input.userId);

    const currentVipExpiresAt = normalizeVipExpiry(await resolvedDeps.findUserVipExpiry(input.userId));
    if (currentVipExpiresAt === undefined) {
      throw new Error('用户不存在');
    }

    const isVipActive = currentVipExpiresAt && currentVipExpiresAt > now;
    const baseDate = isVipActive ? currentVipExpiresAt : now;
    const newExpiresAt = new Date(baseDate.getTime() + redemptionCode.days * DAY_IN_MS);

    await resolvedDeps.updateUserVipExpiry(input.userId, newExpiresAt);
    await resolvedDeps.commit();

    return {
      success: true,
      message: `成功兑换 ${redemptionCode.days} 天，新的到期时间为 ${resolvedDeps.formatDate(newExpiresAt)}`,
    };
  } catch (error) {
    await resolvedDeps.rollback();
    throw new Error(error instanceof Error ? error.message || '兑换失败，请稍后重试' : '兑换失败，请稍后重试');
  } finally {
    resolvedDeps.release?.();
  }
}
