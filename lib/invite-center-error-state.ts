export type InviteCenterErrorState = {
  title: string;
  message: string;
  details: string | null;
};

function normalizeErrorDetails(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message.trim() || null;
  }

  if (typeof error === 'string') {
    const trimmed = error.trim();
    return trimmed || null;
  }

  return null;
}

function isInviteCenterInitializationError(details: string): boolean {
  const normalized = details.toLowerCase();

  return (
    normalized.includes('does not exist') &&
    (normalized.includes('invite_links') || normalized.includes('invite_referrals') || normalized.includes('invitation'))
  );
}

export function resolveInviteCenterErrorState(error: unknown): InviteCenterErrorState {
  const details = normalizeErrorDetails(error);

  if (!details) {
    return {
      title: '邀请中心暂时不可用',
      message: '邀请数据暂时无法加载，请稍后重试。',
      details: null,
    };
  }

  if (isInviteCenterInitializationError(details)) {
    return {
      title: '邀请功能还在准备中',
      message: '当前环境还没完成邀请数据初始化，请联系管理员完成配置后再试。',
      details,
    };
  }

  return {
    title: '邀请中心暂时不可用',
    message: '邀请数据暂时无法加载，请稍后重试；如果问题持续存在，请联系管理员协助排查。',
    details,
  };
}
