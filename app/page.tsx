import { DashboardShell } from '@/components/DashboardShell';
import { Login } from '@/components/Login';
import { getServerSession } from '@/lib/auth';

function getCompanyName(name: string | null | undefined, email: string) {
  if (name?.trim()) {
    return name.trim();
  }

  return email.split('@')[0] || '佩奇家具';
}

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    return <Login />;
  }

  return <DashboardShell companyName={getCompanyName(session.user.name, session.user.email)} />;
}
