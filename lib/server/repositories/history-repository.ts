import 'server-only';

import { query } from '@/lib/db';

type CountRow = {
  count: number;
};

export async function countUserGenerationHistory(userId: string) {
  const result = await query<CountRow>(
    `SELECT COUNT(*)::int AS count FROM generation_history WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0]?.count ?? 0;
}
