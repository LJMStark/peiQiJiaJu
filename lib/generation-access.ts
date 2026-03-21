export const FREE_GENERATION_LIMIT = 10;

type GenerationAccessInput = {
  role?: string | null;
  vipExpiresAt?: Date | string | null;
  generationCount: number;
  freeLimit?: number;
  now?: Date;
};

function normalizeVipExpiresAt(vipExpiresAt: Date | string | null | undefined) {
  if (!vipExpiresAt) {
    return null;
  }

  return vipExpiresAt instanceof Date ? vipExpiresAt : new Date(vipExpiresAt);
}

export function getGenerationAccessState({
  role,
  vipExpiresAt,
  generationCount,
  freeLimit = FREE_GENERATION_LIMIT,
  now = new Date(),
}: GenerationAccessInput) {
  const normalizedVipExpiresAt = normalizeVipExpiresAt(vipExpiresAt);
  const isAdmin = role === 'admin';
  const isVip = Boolean(normalizedVipExpiresAt && normalizedVipExpiresAt > now);
  const vipExpired = !isAdmin && Boolean(normalizedVipExpiresAt && normalizedVipExpiresAt <= now);
  const hasUnlimitedGenerationAccess = isAdmin || isVip;
  const freeLimitReached = !hasUnlimitedGenerationAccess && generationCount >= freeLimit;

  return {
    isAdmin,
    isVip,
    vipExpired,
    freeLimit,
    freeLimitReached,
    hasUnlimitedGenerationAccess,
    canGenerate: hasUnlimitedGenerationAccess || !freeLimitReached,
  };
}
