import 'server-only';

import type { PoolClient, QueryResultRow } from 'pg';
import { db, query } from '@/lib/db';
import type {
  InvitationRepository,
  InvitationServiceUser,
  InviteLinkRecord,
  InviteReferralRecord,
} from './invitation-service';
import { maskInviteeCompanyName, maskInviteeEmail } from '../invitations';

type SqlExecutor = {
  query: PoolClient['query'];
};

type InviteLinkRow = QueryResultRow & {
  id: string;
  inviter_user_id: string;
  code: string;
  status: InviteLinkRecord['status'];
  created_at: Date;
  rotated_at: Date | null;
  rotated_by_user_id: string | null;
  rotation_reason: string | null;
};

type InviteReferralRow = QueryResultRow & {
  id: string;
  invite_link_id: string;
  inviter_user_id: string;
  invitee_user_id: string;
  status: InviteReferralRecord['status'];
  attributed_at: Date;
  verified_at: Date | null;
  attribution_method: InviteReferralRecord['attributionMethod'];
  invitee_email_snapshot: string;
  invitee_company_snapshot: string | null;
};

type InvitationUserRow = QueryResultRow & {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: Date;
};

export type InviteCenterRow = QueryResultRow & {
  status: InviteReferralRecord['status'];
  invitee_email_snapshot: string;
  invitee_company_snapshot: string | null;
  attributed_at: Date;
  verified_at: Date | null;
};

export type InviteCenterData = {
  stats: {
    registered: number;
    pending: number;
    verified: number;
  };
  recentReferrals: Array<{
    maskedEmail: string;
    maskedCompany: string;
    status: InviteReferralRecord['status'];
    attributedAt: string;
    verifiedAt: string | null;
  }>;
};

export type AdminInvitationSummary = {
  totals: {
    activeLinks: number;
    registeredReferrals: number;
    verifiedReferrals: number;
  };
  topInviters: Array<{
    inviterUserId: string;
    inviterName: string;
    inviterEmail: string;
    verifiedReferrals: number;
    totalReferrals: number;
  }>;
  recentReferrals: Array<{
    id: string;
    inviterName: string;
    inviterEmail: string;
    inviteeEmail: string;
    inviteeCompany: string | null;
    status: InviteReferralRecord['status'];
    attributedAt: string;
    verifiedAt: string | null;
  }>;
};

function mapInvitationUser(row: InvitationUserRow): InvitationServiceUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: row.emailVerified,
    createdAt: new Date(row.createdAt),
  };
}

function mapInviteLink(row: InviteLinkRow): InviteLinkRecord {
  return {
    id: row.id,
    inviterUserId: row.inviter_user_id,
    code: row.code,
    status: row.status,
    createdAt: new Date(row.created_at),
    rotatedAt: row.rotated_at ? new Date(row.rotated_at) : null,
    rotatedByUserId: row.rotated_by_user_id,
    rotationReason: row.rotation_reason,
  };
}

function mapInviteReferral(row: InviteReferralRow): InviteReferralRecord {
  return {
    id: row.id,
    inviteLinkId: row.invite_link_id,
    inviterUserId: row.inviter_user_id,
    inviteeUserId: row.invitee_user_id,
    status: row.status,
    attributedAt: new Date(row.attributed_at),
    verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
    attributionMethod: row.attribution_method,
    inviteeEmailSnapshot: row.invitee_email_snapshot,
    inviteeCompanySnapshot: row.invitee_company_snapshot,
  };
}

export function createInvitationRepository(executor: SqlExecutor): InvitationRepository & {
  getUserByEmail(email: string): Promise<InvitationServiceUser | null>;
} {
  return {
    async getUserById(userId) {
      const result = await executor.query<InvitationUserRow>(
        `SELECT id, email, name, "emailVerified", "createdAt" FROM "user" WHERE id = $1`,
        [userId]
      );
      return result.rows[0] ? mapInvitationUser(result.rows[0]) : null;
    },
    async getUserByEmail(email) {
      const result = await executor.query<InvitationUserRow>(
        `SELECT id, email, name, "emailVerified", "createdAt" FROM "user" WHERE LOWER(email) = LOWER($1)`,
        [email]
      );
      return result.rows[0] ? mapInvitationUser(result.rows[0]) : null;
    },
    async getActiveInviteLinkByInviterId(inviterUserId) {
      const result = await executor.query<InviteLinkRow>(
        `SELECT * FROM invite_links WHERE inviter_user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
        [inviterUserId]
      );
      return result.rows[0] ? mapInviteLink(result.rows[0]) : null;
    },
    async getInviteLinkByCode(code) {
      const result = await executor.query<InviteLinkRow>(
        `SELECT * FROM invite_links WHERE code = $1 LIMIT 1`,
        [code]
      );
      return result.rows[0] ? mapInviteLink(result.rows[0]) : null;
    },
    async createInviteLink(input) {
      const result = await executor.query<InviteLinkRow>(
        `
          INSERT INTO invite_links (
            inviter_user_id,
            code,
            status,
            created_at
          )
          VALUES ($1, $2, 'active', $3)
          RETURNING *
        `,
        [input.inviterUserId, input.code, input.createdAt]
      );
      return mapInviteLink(result.rows[0]);
    },
    async rotateInviteLink(input) {
      await executor.query(
        `
          UPDATE invite_links
          SET status = 'rotated',
              rotated_at = $2,
              rotated_by_user_id = $3,
              rotation_reason = $4
          WHERE inviter_user_id = $1
            AND status = 'active'
        `,
        [input.inviterUserId, input.rotatedAt, input.rotatedByUserId, input.rotationReason]
      );
    },
    async getReferralByInviteeUserId(inviteeUserId) {
      const result = await executor.query<InviteReferralRow>(
        `SELECT * FROM invite_referrals WHERE invitee_user_id = $1 LIMIT 1`,
        [inviteeUserId]
      );
      return result.rows[0] ? mapInviteReferral(result.rows[0]) : null;
    },
    async createReferral(input) {
      const result = await executor.query<InviteReferralRow>(
        `
          INSERT INTO invite_referrals (
            invite_link_id,
            inviter_user_id,
            invitee_user_id,
            status,
            attributed_at,
            verified_at,
            attribution_method,
            invitee_email_snapshot,
            invitee_company_snapshot
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `,
        [
          input.inviteLinkId,
          input.inviterUserId,
          input.inviteeUserId,
          input.status,
          input.attributedAt,
          input.verifiedAt,
          input.attributionMethod,
          input.inviteeEmailSnapshot,
          input.inviteeCompanySnapshot,
        ]
      );
      return mapInviteReferral(result.rows[0]);
    },
    async markReferralVerified(input) {
      const result = await executor.query<InviteReferralRow>(
        `
          UPDATE invite_referrals
          SET status = 'verified',
              verified_at = $2,
              invitee_email_snapshot = $3,
              invitee_company_snapshot = $4
          WHERE invitee_user_id = $1
          RETURNING *
        `,
        [input.inviteeUserId, input.verifiedAt, input.inviteeEmailSnapshot, input.inviteeCompanySnapshot]
      );
      return mapInviteReferral(result.rows[0]);
    },
  };
}

export async function withInvitationTransaction<T>(
  fn: (repo: ReturnType<typeof createInvitationRepository>, client: PoolClient) => Promise<T>
) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const repo = createInvitationRepository(client);
    const result = await fn(repo, client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getInviteCenterData(inviterUserId: string): Promise<InviteCenterData> {
  const summaryResult = await query<QueryResultRow & { registered: number; pending: number; verified: number }>(
    `
      SELECT
        COUNT(*)::int AS registered,
        COUNT(*) FILTER (WHERE status = 'registered')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'verified')::int AS verified
      FROM invite_referrals
      WHERE inviter_user_id = $1
    `,
    [inviterUserId]
  );

  const recentResult = await query<InviteCenterRow>(
    `
      SELECT status, invitee_email_snapshot, invitee_company_snapshot, attributed_at, verified_at
      FROM invite_referrals
      WHERE inviter_user_id = $1
      ORDER BY attributed_at DESC
      LIMIT 20
    `,
    [inviterUserId]
  );

  const summaryRow = summaryResult.rows[0];

  return {
    stats: {
      registered: summaryRow?.registered ?? 0,
      pending: summaryRow?.pending ?? 0,
      verified: summaryRow?.verified ?? 0,
    },
    recentReferrals: recentResult.rows.map((row) => ({
      maskedEmail: maskInviteeEmail(row.invitee_email_snapshot),
      maskedCompany: maskInviteeCompanyName(row.invitee_company_snapshot),
      status: row.status,
      attributedAt: new Date(row.attributed_at).toISOString(),
      verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
    })),
  };
}

export async function getAdminInvitationSummary(): Promise<AdminInvitationSummary> {
  const totalsResult = await query<
    QueryResultRow & { active_links: number; registered_referrals: number; verified_referrals: number }
  >(
    `
      SELECT
        (SELECT COUNT(*)::int FROM invite_links WHERE status = 'active') AS active_links,
        (SELECT COUNT(*)::int FROM invite_referrals WHERE status = 'registered') AS registered_referrals,
        (SELECT COUNT(*)::int FROM invite_referrals WHERE status = 'verified') AS verified_referrals
    `
  );

  const topInvitersResult = await query<
    QueryResultRow & {
      inviter_user_id: string;
      inviter_name: string | null;
      inviter_email: string;
      verified_referrals: number;
      total_referrals: number;
    }
  >(
    `
      SELECT
        r.inviter_user_id,
        u.name AS inviter_name,
        u.email AS inviter_email,
        COUNT(*) FILTER (WHERE r.status = 'verified')::int AS verified_referrals,
        COUNT(*)::int AS total_referrals
      FROM invite_referrals r
      JOIN "user" u ON u.id = r.inviter_user_id
      GROUP BY r.inviter_user_id, u.name, u.email
      ORDER BY verified_referrals DESC, total_referrals DESC, u."createdAt" ASC
      LIMIT 20
    `
  );

  const recentReferralsResult = await query<
    QueryResultRow & {
      id: string;
      inviter_name: string | null;
      inviter_email: string;
      invitee_email_snapshot: string;
      invitee_company_snapshot: string | null;
      status: InviteReferralRecord['status'];
      attributed_at: Date;
      verified_at: Date | null;
    }
  >(
    `
      SELECT
        r.id,
        inviter.name AS inviter_name,
        inviter.email AS inviter_email,
        r.invitee_email_snapshot,
        r.invitee_company_snapshot,
        r.status,
        r.attributed_at,
        r.verified_at
      FROM invite_referrals r
      JOIN "user" inviter ON inviter.id = r.inviter_user_id
      ORDER BY r.attributed_at DESC
      LIMIT 50
    `
  );

  const totalsRow = totalsResult.rows[0];

  return {
    totals: {
      activeLinks: totalsRow?.active_links ?? 0,
      registeredReferrals: totalsRow?.registered_referrals ?? 0,
      verifiedReferrals: totalsRow?.verified_referrals ?? 0,
    },
    topInviters: topInvitersResult.rows.map((row) => ({
      inviterUserId: row.inviter_user_id,
      inviterName: row.inviter_name?.trim() || '未命名',
      inviterEmail: row.inviter_email,
      verifiedReferrals: row.verified_referrals,
      totalReferrals: row.total_referrals,
    })),
    recentReferrals: recentReferralsResult.rows.map((row) => ({
      id: row.id,
      inviterName: row.inviter_name?.trim() || '未命名',
      inviterEmail: row.inviter_email,
      inviteeEmail: row.invitee_email_snapshot,
      inviteeCompany: row.invitee_company_snapshot,
      status: row.status,
      attributedAt: new Date(row.attributed_at).toISOString(),
      verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
    })),
  };
}
