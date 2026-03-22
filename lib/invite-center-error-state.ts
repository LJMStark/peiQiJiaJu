export type InviteCenterErrorState = {
  title: string;
  message: string;
  details: string | null;
};

export type AdminInvitationErrorState = InviteCenterErrorState & {
  setupCommand: string | null;
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

export function resolveAdminInvitationErrorState(error: unknown): AdminInvitationErrorState {
  const details = normalizeErrorDetails(error);

  if (!details) {
    return {
      title: '邀请管理暂时不可用',
      message: '邀请汇总暂时无法加载，请稍后重试。',
      details: null,
      setupCommand: null,
    };
  }

  if (isInviteCenterInitializationError(details)) {
    return {
      title: '邀请功能尚未初始化',
      message: '当前环境缺少邀请系统数据表，请先运行 `npm run invite:migrate` 完成初始化，然后重新部署或重启服务。',
      details,
      setupCommand: 'npm run invite:migrate',
    };
  }

  return {
    title: '邀请管理暂时不可用',
    message: '邀请汇总加载失败，请稍后重试；如果问题持续存在，请检查数据库和部署日志。',
    details,
    setupCommand: null,
  };
}
