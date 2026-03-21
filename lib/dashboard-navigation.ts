import {
  INVITE_DASHBOARD_PATH,
  INVITE_DASHBOARD_TAB,
  VIP_CENTER_DEFAULT_SECTION,
  VIP_CENTER_INVITE_SECTION,
  VIP_DASHBOARD_TAB,
} from './invitations.ts';

export type DashboardTab = 'catalog' | 'editor' | typeof VIP_DASHBOARD_TAB;
export type VipCenterSection = typeof VIP_CENTER_DEFAULT_SECTION | typeof VIP_CENTER_INVITE_SECTION;

type DashboardLocation = {
  activeTab: DashboardTab;
  vipSection: VipCenterSection;
  canonicalPath: string | null;
};

export function buildDashboardPath(
  tab: DashboardTab,
  options?: {
    vipSection?: VipCenterSection;
  }
): string {
  if (tab === 'catalog') {
    return '/';
  }

  if (tab === 'editor') {
    return '/?tab=editor';
  }

  if (options?.vipSection === VIP_CENTER_INVITE_SECTION) {
    return INVITE_DASHBOARD_PATH;
  }

  return `/?tab=${VIP_DASHBOARD_TAB}`;
}

export function normalizeVipCenterSection(section: string | null | undefined): VipCenterSection {
  if (section === VIP_CENTER_INVITE_SECTION) {
    return VIP_CENTER_INVITE_SECTION;
  }

  return VIP_CENTER_DEFAULT_SECTION;
}

export function resolveDashboardLocation(tab: string | null, section: string | null): DashboardLocation {
  if (tab === INVITE_DASHBOARD_TAB) {
    return {
      activeTab: VIP_DASHBOARD_TAB,
      vipSection: VIP_CENTER_INVITE_SECTION,
      canonicalPath: INVITE_DASHBOARD_PATH,
    };
  }

  if (tab === 'editor') {
    return {
      activeTab: 'editor',
      vipSection: VIP_CENTER_DEFAULT_SECTION,
      canonicalPath: section ? buildDashboardPath('editor') : null,
    };
  }

  if (tab === VIP_DASHBOARD_TAB) {
    const vipSection = normalizeVipCenterSection(section);
    const canonicalPath =
      !section
        ? null
        : buildDashboardPath(VIP_DASHBOARD_TAB, {
            vipSection,
          });

    return {
      activeTab: VIP_DASHBOARD_TAB,
      vipSection,
      canonicalPath,
    };
  }

  if (!tab || tab === 'catalog') {
    return {
      activeTab: 'catalog',
      vipSection: VIP_CENTER_DEFAULT_SECTION,
      canonicalPath: section ? buildDashboardPath('catalog') : null,
    };
  }

  return {
    activeTab: 'catalog',
    vipSection: VIP_CENTER_DEFAULT_SECTION,
    canonicalPath: buildDashboardPath('catalog'),
  };
}
