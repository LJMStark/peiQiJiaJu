'use client';

import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/Dashboard';
import { signOut } from '@/lib/auth-client';

type DashboardShellProps = {
  companyName: string;
  user: {
    id: string;
    role?: string;
    vipExpiresAt?: Date | null;
  };
};

export function DashboardShell({ companyName, user }: DashboardShellProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  return <Dashboard companyName={companyName} user={user} onLogout={handleLogout} />;
}
