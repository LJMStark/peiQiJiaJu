import { FREE_GENERATION_LIMIT, getGenerationAccessState } from '../../generation-access.ts';
import { createRouteError } from '../http/error-envelope.ts';

export type GenerationServiceUser = {
  id: string;
  role?: string | null;
  vipExpiresAt?: Date | string | null;
};

export type GenerationExecutionDeps = {
  runWithConcurrencyGuard?: <T>(
    userId: string,
    action: () => Promise<T>
  ) => Promise<T>;
  getGenerationCount: (userId: string) => Promise<number>;
};

function getVipExpiredMessage() {
  return '您的会员套餐已到期，请联系客服咨询续费。';
}

function getFreeLimitReachedMessage() {
  return `免费用户生图额度已用完（共 ${FREE_GENERATION_LIMIT} 张），请联系客服咨询购买会员套餐。`;
}

function resolveRunWithConcurrencyGuard(
  runWithConcurrencyGuard?: GenerationExecutionDeps['runWithConcurrencyGuard']
) {
  return runWithConcurrencyGuard ?? (async function passthrough<T>(
    _userId: string,
    action: () => Promise<T>
  ) {
    return action();
  });
}

export async function runGenerationWithAccess<T>(
  user: GenerationServiceUser,
  deps: GenerationExecutionDeps,
  action: () => Promise<T>
) {
  const runWithConcurrencyGuard = resolveRunWithConcurrencyGuard(deps.runWithConcurrencyGuard);

  return runWithConcurrencyGuard(user.id, async () => {
    const generationCount = await deps.getGenerationCount(user.id);
    const access = getGenerationAccessState({
      role: user.role,
      vipExpiresAt: user.vipExpiresAt,
      generationCount,
    });

    if (access.vipExpired) {
      throw createRouteError({
        status: 403,
        code: 'VIP_EXPIRED',
        message: getVipExpiredMessage(),
      });
    }

    if (access.freeLimitReached) {
      throw createRouteError({
        status: 403,
        code: 'FREE_LIMIT_REACHED',
        message: getFreeLimitReachedMessage(),
      });
    }

    return action();
  });
}

export async function createDefaultGenerationExecutionDeps() {
  const [
    { countUserGenerationHistory },
    { runWithGenerationConcurrencyGuard },
  ] = await Promise.all([
    import('../repositories/history-repository.ts'),
    import('../generation-concurrency.ts'),
  ]);

  return {
    runWithConcurrencyGuard(userId, action) {
      return runWithGenerationConcurrencyGuard(userId, action);
    },
    async getGenerationCount(userId) {
      return countUserGenerationHistory(userId);
    },
  } satisfies GenerationExecutionDeps;
}
