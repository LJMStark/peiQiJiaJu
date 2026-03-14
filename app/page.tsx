import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { Login } from '@/components/Login';
import { getServerSession, isSessionEmailVerified } from '@/lib/auth';

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

  if (!isSessionEmailVerified(session)) {
    redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
  }

  return (
    <DashboardShell 
      companyName={getCompanyName(session.user.name, session.user.email)} 
      user={{
        id: session.user.id,
        role: session.user.role as string | undefined,
        vipExpiresAt: session.user.vipExpiresAt ? new Date(session.user.vipExpiresAt) : null,
      }}
    />
  );
}
