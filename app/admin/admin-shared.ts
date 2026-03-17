const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const ADMIN_NAV_ITEMS = [
  {
    href: '/admin',
    label: '数据看板',
  },
  {
    href: '/admin/codes',
    label: '兑换码管理',
  },
] as const;

export function getShanghaiDayRange(now: Date = new Date()) {
  const shanghaiNow = new Date(now.getTime() + SHANGHAI_OFFSET_MS);
  const dayStartMs =
    Date.UTC(
      shanghaiNow.getUTCFullYear(),
      shanghaiNow.getUTCMonth(),
      shanghaiNow.getUTCDate()
    ) - SHANGHAI_OFFSET_MS;

  return {
    start: new Date(dayStartMs),
    end: new Date(dayStartMs + DAY_IN_MS),
  };
}

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function isAdminNavActive(pathname: string, href: string) {
  const currentPath = normalizePathname(pathname);
  const targetPath = normalizePathname(href);

  if (targetPath === '/admin') {
    return currentPath === targetPath;
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

export function getAdminNavLinkClass(pathname: string, href: string) {
  const baseClass =
    'px-4 py-2 rounded-lg font-medium transition-colors';

  if (isAdminNavActive(pathname, href)) {
    return `${baseClass} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`;
  }

  return `${baseClass} text-gray-700 hover:bg-gray-100`;
}
