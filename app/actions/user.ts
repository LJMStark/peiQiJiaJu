'use server';

import { getServerSession } from '@/lib/auth';
import { redeemMembershipCode } from '@/lib/server/services/membership-service';

/**
 * 兑换 VIP 卡密
 */
export async function redeemCode(code: string): Promise<{ success: boolean; message: string }> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  return redeemMembershipCode({
    userId: session.user.id,
    code,
  });
}
