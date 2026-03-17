'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  ADMIN_NAV_ITEMS,
  getAdminNavLinkClass,
} from './admin-shared';

export function AdminNavLinks() {
  const pathname = usePathname();

  return (
    <>
      {ADMIN_NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={getAdminNavLinkClass(pathname, item.href)}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}
