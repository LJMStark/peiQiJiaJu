'use client';

import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/Dashboard';
import { signOut } from '@/lib/auth-client';

type DashboardShellProps = {
  companyName: string;
};

export function DashboardShell({ companyName }: DashboardShellProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  return <Dashboard companyName={companyName} onLogout={handleLogout} />;
}
