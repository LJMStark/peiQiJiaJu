import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  InvitationRepository,
  InvitationServiceUser,
  InviteLinkRecord,
  InviteReferralRecord,
} from '../lib/server/invitation-service.ts';
import {
  claimInviteFromLink,
  ensureInviteLinkForUser,
  finalizeInviteAfterVerification,
  recordInviteSignup,
  rotateInviteLinkForUser,
} from '../lib/server/invitation-service.ts';

type MemoryRepo = InvitationRepository & {
  referrals: InviteReferralRecord[];
};

function createMemoryRepo(users: InvitationServiceUser[]): MemoryRepo {
  const userMap = new Map(users.map((user) => [user.id, { ...user }]));
  const links: InviteLinkRecord[] = [];
  const referrals: InviteReferralRecord[] = [];

  return {
    referrals,
    async getUserById(userId) {
      return userMap.get(userId) ?? null;
    },
    async getActiveInviteLinkByInviterId(inviterUserId) {
      return links.find((link) => link.inviterUserId === inviterUserId && link.status === 'active') ?? null;
    },
    async getInviteLinkByCode(code) {
      return links.find((link) => link.code === code) ?? null;
    },
    async createInviteLink(input) {
      const link: InviteLinkRecord = {
        id: `link_${links.length + 1}`,
        inviterUserId: input.inviterUserId,
        code: input.code,
        status: 'active',
        createdAt: input.createdAt,
        rotatedAt: null,
        rotatedByUserId: null,
        rotationReason: null,
      };
      links.push(link);
      return link;
    },
    async rotateInviteLink(input) {
      const activeLink = links.find((link) => link.inviterUserId === input.inviterUserId && link.status === 'active');
      if (activeLink) {
        activeLink.status = 'rotated';
        activeLink.rotatedAt = input.rotatedAt;
        activeLink.rotatedByUserId = input.rotatedByUserId;
        activeLink.rotationReason = input.rotationReason;
      }
    },
    async getReferralByInviteeUserId(inviteeUserId) {
      return referrals.find((referral) => referral.inviteeUserId === inviteeUserId) ?? null;
    },
    async createReferral(input) {
      const referral: InviteReferralRecord = {
        id: `ref_${referrals.length + 1}`,
        inviteLinkId: input.inviteLinkId,
        inviterUserId: input.inviterUserId,
        inviteeUserId: input.inviteeUserId,
        status: input.status,
        attributedAt: input.attributedAt,
        verifiedAt: input.verifiedAt,
        attributionMethod: input.attributionMethod,
        inviteeEmailSnapshot: input.inviteeEmailSnapshot,
        inviteeCompanySnapshot: input.inviteeCompanySnapshot,
      };
      referrals.push(referral);
      return referral;
    },
    async markReferralVerified(input) {
      const existingReferral = referrals.find((referral) => referral.inviteeUserId === input.inviteeUserId);
      if (!existingReferral) {
        throw new Error('Referral not found');
      }
      existingReferral.status = 'verified';
      existingReferral.verifiedAt = input.verifiedAt;
      existingReferral.inviteeEmailSnapshot = input.inviteeEmailSnapshot;
      existingReferral.inviteeCompanySnapshot = input.inviteeCompanySnapshot;
      return existingReferral;
    },
  };
}

test('ensureInviteLinkForUser creates a single active link for verified users', async () => {
  const repo = createMemoryRepo([
    {
      id: 'inviter',
      email: 'inviter@example.com',
      name: '佩奇家具',
      emailVerified: true,
      createdAt: new Date('2026-03-21T00:00:00.000Z'),
    },
  ]);

  const firstLink = await ensureInviteLinkForUser({
    repo,
    inviterUserId: 'inviter',
    baseUrl: 'https://peiqi.example.com',
    now: new Date('2026-03-21T01:00:00.000Z'),
    codeGenerator: () => 'INVITE000001',
  });
  const secondLink = await ensureInviteLinkForUser({
    repo,
    inviterUserId: 'inviter',
    baseUrl: 'https://peiqi.example.com',
    now: new Date('2026-03-21T02:00:00.000Z'),
    codeGenerator: () => 'INVITE000002',
  });

  assert.equal(firstLink.code, 'INVITE000001');
  assert.equal(secondLink.code, 'INVITE000001');
  assert.equal(repo.referrals.length, 0);
});

test('claimInviteFromLink rejects self-invites and older accounts', async () => {
  const repo = createMemoryRepo([
    {
      id: 'inviter',
      email: 'inviter@example.com',
      name: '佩奇家具',
      emailVerified: true,
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
    },
    {
      id: 'self-user',
      email: 'inviter@example.com',
      name: '佩奇家具',
      emailVerified: false,
      createdAt: new Date('2026-03-21T10:00:00.000Z'),
    },
    {
      id: 'old-user',
      email: 'old@example.com',
      name: '旧用户',
      emailVerified: false,
      createdAt: new Date('2026-03-19T00:00:00.000Z'),
    },
  ]);

  await ensureInviteLinkForUser({
    repo,
    inviterUserId: 'inviter',
    baseUrl: 'https://peiqi.example.com',
    now: new Date('2026-03-21T01:00:00.000Z'),
    codeGenerator: () => 'INVITE000001',
  });

  await assert.rejects(
    claimInviteFromLink({
      repo,
      inviteCode: 'INVITE000001',
      inviteeUserId: 'self-user',
      now: new Date('2026-03-21T12:00:00.000Z'),
    }),
    /SELF_INVITE_NOT_ALLOWED/
  );

  await assert.rejects(
    claimInviteFromLink({
      repo,
      inviteCode: 'INVITE000001',
      inviteeUserId: 'old-user',
      now: new Date('2026-03-21T12:00:00.000Z'),
    }),
    /INVITE_LATE_CLAIM_WINDOW_EXPIRED/
  );
});

test('recordInviteSignup creates a registered referral and finalizeInviteAfterVerification upgrades it', async () => {
  const repo = createMemoryRepo([
    {
      id: 'inviter',
      email: 'inviter@example.com',
      name: '佩奇家具',
      emailVerified: true,
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
    },
    {
      id: 'invitee',
      email: 'invitee@example.com',
      name: '客户公司',
      emailVerified: false,
      createdAt: new Date('2026-03-21T10:00:00.000Z'),
    },
  ]);

  await ensureInviteLinkForUser({
    repo,
    inviterUserId: 'inviter',
    baseUrl: 'https://peiqi.example.com',
    now: new Date('2026-03-21T01:00:00.000Z'),
    codeGenerator: () => 'INVITE000001',
  });

  const referral = await recordInviteSignup({
    repo,
    inviteCode: 'INVITE000001',
    inviteeUserId: 'invitee',
    inviteeEmail: 'invitee@example.com',
    inviteeCompanyName: '客户公司',
    now: new Date('2026-03-21T10:05:00.000Z'),
  });

  assert.equal(referral?.status, 'registered');

  const verifiedReferral = await finalizeInviteAfterVerification({
    repo,
    inviteeUserId: 'invitee',
    fallbackInviteCode: null,
    now: new Date('2026-03-21T10:10:00.000Z'),
  });

  assert.equal(verifiedReferral?.status, 'verified');
  assert.equal(verifiedReferral?.verifiedAt?.toISOString(), '2026-03-21T10:10:00.000Z');
});

test('finalizeInviteAfterVerification creates a verified late-claim referral when signup attribution is missing', async () => {
  const repo = createMemoryRepo([
    {
      id: 'inviter',
      email: 'inviter@example.com',
      name: '佩奇家具',
      emailVerified: true,
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
    },
    {
      id: 'invitee',
      email: 'invitee@example.com',
      name: '客户公司',
      emailVerified: true,
      createdAt: new Date('2026-03-21T10:00:00.000Z'),
    },
  ]);

  await ensureInviteLinkForUser({
    repo,
    inviterUserId: 'inviter',
    baseUrl: 'https://peiqi.example.com',
    now: new Date('2026-03-21T01:00:00.000Z'),
    codeGenerator: () => 'INVITE000001',
  });

  const verifiedReferral = await finalizeInviteAfterVerification({
    repo,
    inviteeUserId: 'invitee',
    fallbackInviteCode: 'INVITE000001',
    now: new Date('2026-03-21T10:12:00.000Z'),
  });

  assert.equal(verifiedReferral?.status, 'verified');
  assert.equal(verifiedReferral?.attributionMethod, 'late-claim');
  assert.equal(verifiedReferral?.verifiedAt?.toISOString(), '2026-03-21T10:12:00.000Z');
});

test('claimInviteFromLink creates a verified referral for recent verified users and respects first invite wins', async () => {
  const repo = createMemoryRepo([
    {
      id: 'inviter-a',
      email: 'inviter-a@example.com',
      name: '邀请人A',
      emailVerified: true,
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
    },
    {
      id: 'inviter-b',
      email: 'inviter-b@example.com',
      name: '邀请人B',
      emailVerified: true,
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
    },
    {
      id: 'invitee',
      email: 'invitee@example.com',
      name: '客户公司',
      emailVerified: true,
      createdAt: new Date('2026-03-21T10:00:00.000Z'),
    },
  ]);

  await ensureInviteLinkForUser({
    repo,
    inviterUserId: 'inviter-a',
    baseUrl: 'https://peiqi.example.com',
    now: new Date('2026-03-21T01:00:00.000Z'),
    codeGenerator: () => 'INVITE000001',
  });
  await ensureInviteLinkForUser({
    repo,
    inviterUserId: 'inviter-b',
    baseUrl: 'https://peiqi.example.com',
    now: new Date('2026-03-21T01:05:00.000Z'),
    codeGenerator: () => 'INVITE000002',
  });

  const firstReferral = await claimInviteFromLink({
    repo,
    inviteCode: 'INVITE000001',
    inviteeUserId: 'invitee',
    now: new Date('2026-03-21T10:15:00.000Z'),
  });

  assert.equal(firstReferral.status, 'verified');

  await assert.rejects(
    claimInviteFromLink({
      repo,
      inviteCode: 'INVITE000002',
      inviteeUserId: 'invitee',
      now: new Date('2026-03-21T10:20:00.000Z'),
    }),
    /INVITEE_ALREADY_ATTRIBUTED/
  );
});

test('rotateInviteLinkForUser invalidates the previous code immediately', async () => {
  const repo = createMemoryRepo([
    {
      id: 'inviter',
      email: 'inviter@example.com',
      name: '佩奇家具',
      emailVerified: true,
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
    },
    {
      id: 'invitee',
      email: 'invitee@example.com',
      name: '客户公司',
      emailVerified: false,
      createdAt: new Date('2026-03-21T10:00:00.000Z'),
    },
  ]);

  await ensureInviteLinkForUser({
    repo,
    inviterUserId: 'inviter',
    baseUrl: 'https://peiqi.example.com',
    now: new Date('2026-03-21T01:00:00.000Z'),
    codeGenerator: () => 'INVITE000001',
  });

  const rotated = await rotateInviteLinkForUser({
    repo,
    targetUserId: 'inviter',
    rotatedByUserId: 'inviter',
    rotationReason: 'user_reset',
    baseUrl: 'https://peiqi.example.com',
    now: new Date('2026-03-21T02:00:00.000Z'),
    codeGenerator: () => 'INVITE000999',
  });

  assert.equal(rotated.code, 'INVITE000999');

  await assert.rejects(
    claimInviteFromLink({
      repo,
      inviteCode: 'INVITE000001',
      inviteeUserId: 'invitee',
      now: new Date('2026-03-21T10:15:00.000Z'),
    }),
    /INVITE_LINK_NOT_ACTIVE/
  );
});

test('invite link creation retries when a generated code collides with an existing unique key', async () => {
  const repo = createMemoryRepo([
    {
      id: 'inviter',
      email: 'inviter@example.com',
      name: '佩奇家具',
      emailVerified: true,
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
    },
  ]);

  const originalCreateInviteLink = repo.createInviteLink;
  let createAttempts = 0;

  repo.createInviteLink = async (input) => {
    createAttempts += 1;

    if (createAttempts === 1) {
      const collisionError = new Error('duplicate invite code') as Error & { code?: string };
      collisionError.code = '23505';
      throw collisionError;
    }

    return originalCreateInviteLink(input);
  };

  const generatedCodes = ['INVITE000001', 'INVITE000999'];
  const inviteLink = await ensureInviteLinkForUser({
    repo,
    inviterUserId: 'inviter',
    baseUrl: 'https://peiqi.example.com',
    now: new Date('2026-03-21T01:00:00.000Z'),
    codeGenerator: () => generatedCodes.shift() ?? 'INVITE000777',
  });

  assert.equal(inviteLink.code, 'INVITE000999');
  assert.equal(createAttempts, 2);
});
