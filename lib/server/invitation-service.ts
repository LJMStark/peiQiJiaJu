import { INVITE_LATE_CLAIM_WINDOW_HOURS, buildInviteUrl } from '../invitations.ts';

const MAX_INVITE_CODE_GENERATION_ATTEMPTS = 5;
const INVITE_LATE_CLAIM_WINDOW_MS = INVITE_LATE_CLAIM_WINDOW_HOURS * 60 * 60 * 1000;
const NON_FATAL_FINALIZE_ERROR_MESSAGES = new Set([
  'INVITE_LINK_NOT_FOUND',
  'INVITE_LINK_NOT_ACTIVE',
  'INVITE_LATE_CLAIM_WINDOW_EXPIRED',
  'SELF_INVITE_NOT_ALLOWED',
  'INVITEE_ALREADY_ATTRIBUTED',
]);

export type InviteLinkStatus = 'active' | 'rotated' | 'disabled';
export type InviteReferralStatus = 'registered' | 'verified';
export type InviteAttributionMethod = 'signup' | 'late-claim';

export type InvitationServiceUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: Date;
};

export type InviteLinkRecord = {
  id: string;
  inviterUserId: string;
  code: string;
  status: InviteLinkStatus;
  createdAt: Date;
  rotatedAt: Date | null;
  rotatedByUserId: string | null;
  rotationReason: string | null;
};

export type InviteReferralRecord = {
  id: string;
  inviteLinkId: string;
  inviterUserId: string;
  inviteeUserId: string;
  status: InviteReferralStatus;
  attributedAt: Date;
  verifiedAt: Date | null;
  attributionMethod: InviteAttributionMethod;
  inviteeEmailSnapshot: string;
  inviteeCompanySnapshot: string | null;
};

type CreateInviteLinkInput = {
  inviterUserId: string;
  code: string;
  createdAt: Date;
};

type RotateInviteLinkInput = {
  inviterUserId: string;
  rotatedAt: Date;
  rotatedByUserId: string;
  rotationReason: string;
};

type CreateReferralInput = {
  inviteLinkId: string;
  inviterUserId: string;
  inviteeUserId: string;
  status: InviteReferralStatus;
  attributedAt: Date;
  verifiedAt: Date | null;
  attributionMethod: InviteAttributionMethod;
  inviteeEmailSnapshot: string;
  inviteeCompanySnapshot: string | null;
};

type MarkReferralVerifiedInput = {
  inviteeUserId: string;
  verifiedAt: Date;
  inviteeEmailSnapshot: string;
  inviteeCompanySnapshot: string | null;
};

export type InvitationRepository = {
  getUserById(userId: string): Promise<InvitationServiceUser | null>;
  getActiveInviteLinkByInviterId(inviterUserId: string): Promise<InviteLinkRecord | null>;
  getInviteLinkByCode(code: string): Promise<InviteLinkRecord | null>;
  createInviteLink(input: CreateInviteLinkInput): Promise<InviteLinkRecord>;
  rotateInviteLink(input: RotateInviteLinkInput): Promise<void>;
  getReferralByInviteeUserId(inviteeUserId: string): Promise<InviteReferralRecord | null>;
  createReferral(input: CreateReferralInput): Promise<InviteReferralRecord>;
  markReferralVerified(input: MarkReferralVerifiedInput): Promise<InviteReferralRecord>;
};

type EnsureInviteLinkForUserInput = {
  repo: InvitationRepository;
  inviterUserId: string;
  baseUrl: string;
  now: Date;
  codeGenerator: () => string;
};

type InviteLinkResult = InviteLinkRecord & {
  inviteUrl: string;
};

type ClaimInviteFromLinkInput = {
  repo: InvitationRepository;
  inviteCode: string;
  inviteeUserId: string;
  now: Date;
};

type RecordInviteSignupInput = {
  repo: InvitationRepository;
  inviteCode: string;
  inviteeUserId: string;
  inviteeEmail: string;
  inviteeCompanyName: string | null;
  now: Date;
};

type FinalizeInviteAfterVerificationInput = {
  repo: InvitationRepository;
  inviteeUserId: string;
  fallbackInviteCode: string | null;
  now: Date;
};

type RotateInviteLinkForUserInput = {
  repo: InvitationRepository;
  targetUserId: string;
  rotatedByUserId: string;
  rotationReason: string;
  baseUrl: string;
  now: Date;
  codeGenerator: () => string;
};

function normalizeInviteeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeInviteeCompanyName(companyName: string | null | undefined): string | null {
  const trimmedCompanyName = companyName?.trim();
  return trimmedCompanyName ? trimmedCompanyName : null;
}

function buildInviteeSnapshot(email: string, companyName: string | null | undefined) {
  return {
    inviteeEmailSnapshot: normalizeInviteeEmail(email),
    inviteeCompanySnapshot: normalizeInviteeCompanyName(companyName),
  };
}

function isLateClaimEligible(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() <= INVITE_LATE_CLAIM_WINDOW_MS;
}

function buildInviteLinkResult(baseUrl: string, link: InviteLinkRecord): InviteLinkResult {
  return {
    ...link,
    inviteUrl: buildInviteUrl(baseUrl, link.code),
  };
}

function isInviteCodeConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

function assertNotSelfInvite(input: {
  inviterUserId: string;
  inviterEmail: string;
  inviteeUserId: string;
  inviteeEmail: string;
}): void {
  if (input.inviterUserId === input.inviteeUserId) {
    throw new Error('SELF_INVITE_NOT_ALLOWED');
  }

  if (normalizeInviteeEmail(input.inviterEmail) === normalizeInviteeEmail(input.inviteeEmail)) {
    throw new Error('SELF_INVITE_NOT_ALLOWED');
  }
}

async function getInviterUserOrThrow(
  repo: InvitationRepository,
  inviterUserId: string
): Promise<InvitationServiceUser> {
  const inviterUser = await repo.getUserById(inviterUserId);
  if (!inviterUser) {
    throw new Error('INVITER_NOT_FOUND');
  }

  return inviterUser;
}

async function createInviteLinkWithRetries(params: {
  repo: InvitationRepository;
  inviterUserId: string;
  createdAt: Date;
  codeGenerator: () => string;
}) {
  const { repo, inviterUserId, createdAt, codeGenerator } = params;

  for (let attempt = 0; attempt < MAX_INVITE_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      return await repo.createInviteLink({
        inviterUserId,
        code: codeGenerator(),
        createdAt,
      });
    } catch (error) {
      if (!isInviteCodeConflict(error) || attempt === MAX_INVITE_CODE_GENERATION_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw new Error('INVITE_CODE_GENERATION_FAILED');
}

async function getValidatedInviteLink(repo: InvitationRepository, inviteCode: string) {
  const inviteLink = await repo.getInviteLinkByCode(inviteCode);

  if (!inviteLink) {
    throw new Error('INVITE_LINK_NOT_FOUND');
  }

  if (inviteLink.status !== 'active') {
    throw new Error('INVITE_LINK_NOT_ACTIVE');
  }

  return inviteLink;
}

async function createReferralFromUser(params: {
  repo: InvitationRepository;
  inviteLink: InviteLinkRecord;
  inviteeUser: InvitationServiceUser;
  attributionMethod: InviteAttributionMethod;
  now: Date;
}) {
  const { repo, inviteLink, inviteeUser, attributionMethod, now } = params;
  const inviterUser = await getInviterUserOrThrow(repo, inviteLink.inviterUserId);

  assertNotSelfInvite({
    inviterUserId: inviteLink.inviterUserId,
    inviterEmail: inviterUser.email,
    inviteeUserId: inviteeUser.id,
    inviteeEmail: inviteeUser.email,
  });

  const existingReferral = await repo.getReferralByInviteeUserId(inviteeUser.id);
  if (existingReferral) {
    throw new Error('INVITEE_ALREADY_ATTRIBUTED');
  }

  if (!isLateClaimEligible(inviteeUser.createdAt, now)) {
    throw new Error('INVITE_LATE_CLAIM_WINDOW_EXPIRED');
  }

  return repo.createReferral({
    inviteLinkId: inviteLink.id,
    inviterUserId: inviteLink.inviterUserId,
    inviteeUserId: inviteeUser.id,
    status: inviteeUser.emailVerified ? 'verified' : 'registered',
    attributedAt: now,
    verifiedAt: inviteeUser.emailVerified ? now : null,
    attributionMethod,
    ...buildInviteeSnapshot(inviteeUser.email, inviteeUser.name),
  });
}

export async function ensureInviteLinkForUser(input: EnsureInviteLinkForUserInput): Promise<InviteLinkResult> {
  const { repo, inviterUserId, baseUrl, now, codeGenerator } = input;
  const inviterUser = await repo.getUserById(inviterUserId);

  if (!inviterUser) {
    throw new Error('INVITER_NOT_FOUND');
  }

  if (!inviterUser.emailVerified) {
    throw new Error('INVITER_EMAIL_NOT_VERIFIED');
  }

  const existingLink = await repo.getActiveInviteLinkByInviterId(inviterUserId);
  if (existingLink) {
    return buildInviteLinkResult(baseUrl, existingLink);
  }

  const inviteLink = await createInviteLinkWithRetries({
    repo,
    inviterUserId,
    createdAt: now,
    codeGenerator,
  });

  return buildInviteLinkResult(baseUrl, inviteLink);
}

export async function getInviteLinkForUser(input: {
  repo: InvitationRepository;
  inviterUserId: string;
  baseUrl: string;
}): Promise<InviteLinkResult | null> {
  const existingLink = await input.repo.getActiveInviteLinkByInviterId(input.inviterUserId);

  if (!existingLink) {
    return null;
  }

  return buildInviteLinkResult(input.baseUrl, existingLink);
}

export async function claimInviteFromLink(input: ClaimInviteFromLinkInput): Promise<InviteReferralRecord> {
  const { repo, inviteCode, inviteeUserId, now } = input;
  const inviteLink = await getValidatedInviteLink(repo, inviteCode);
  const inviteeUser = await repo.getUserById(inviteeUserId);

  if (!inviteeUser) {
    throw new Error('INVITEE_NOT_FOUND');
  }

  return createReferralFromUser({
    repo,
    inviteLink,
    inviteeUser,
    attributionMethod: 'late-claim',
    now,
  });
}

export async function recordInviteSignup(input: RecordInviteSignupInput): Promise<InviteReferralRecord | null> {
  const { repo, inviteCode, inviteeUserId, inviteeEmail, inviteeCompanyName, now } = input;
  const inviteLink = await repo.getInviteLinkByCode(inviteCode);

  if (!inviteLink || inviteLink.status !== 'active') {
    return null;
  }

  const existingReferral = await repo.getReferralByInviteeUserId(inviteeUserId);
  if (existingReferral) {
    return existingReferral;
  }

  const inviterUser = await getInviterUserOrThrow(repo, inviteLink.inviterUserId);

  assertNotSelfInvite({
    inviterUserId: inviteLink.inviterUserId,
    inviterEmail: inviterUser.email,
    inviteeUserId,
    inviteeEmail,
  });

  return repo.createReferral({
    inviteLinkId: inviteLink.id,
    inviterUserId: inviteLink.inviterUserId,
    inviteeUserId,
    status: 'registered',
    attributedAt: now,
    verifiedAt: null,
    attributionMethod: 'signup',
    ...buildInviteeSnapshot(inviteeEmail, inviteeCompanyName),
  });
}

export async function finalizeInviteAfterVerification(
  input: FinalizeInviteAfterVerificationInput
): Promise<InviteReferralRecord | null> {
  const { repo, inviteeUserId, fallbackInviteCode, now } = input;
  const inviteeUser = await repo.getUserById(inviteeUserId);

  if (!inviteeUser) {
    throw new Error('INVITEE_NOT_FOUND');
  }

  const existingReferral = await repo.getReferralByInviteeUserId(inviteeUserId);
  if (existingReferral) {
    if (existingReferral.status === 'verified') {
      return existingReferral;
    }

    return repo.markReferralVerified({
      inviteeUserId,
      verifiedAt: now,
      ...buildInviteeSnapshot(inviteeUser.email, inviteeUser.name),
    });
  }

  if (!fallbackInviteCode) {
    return null;
  }

  try {
    const inviteLink = await getValidatedInviteLink(repo, fallbackInviteCode);

    return await createReferralFromUser({
      repo,
      inviteLink,
      inviteeUser,
      attributionMethod: 'late-claim',
      now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVITE_FINALIZE_FAILED';

    if (NON_FATAL_FINALIZE_ERROR_MESSAGES.has(message)) {
      return null;
    }

    throw error;
  }
}

export async function rotateInviteLinkForUser(input: RotateInviteLinkForUserInput): Promise<InviteLinkResult> {
  const { repo, targetUserId, rotatedByUserId, rotationReason, baseUrl, now, codeGenerator } = input;
  const targetUser = await repo.getUserById(targetUserId);

  if (!targetUser) {
    throw new Error('INVITER_NOT_FOUND');
  }

  if (!targetUser.emailVerified) {
    throw new Error('INVITER_EMAIL_NOT_VERIFIED');
  }

  await repo.rotateInviteLink({
    inviterUserId: targetUserId,
    rotatedAt: now,
    rotatedByUserId,
    rotationReason,
  });

  const newLink = await createInviteLinkWithRetries({
    repo,
    inviterUserId: targetUserId,
    createdAt: now,
    codeGenerator,
  });

  return buildInviteLinkResult(baseUrl, newLink);
}
