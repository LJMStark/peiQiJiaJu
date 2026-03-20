import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { Login } from '@/components/Login';
import { getServerSession, isSessionEmailVerified } from '@/lib/auth';
import { getDisplayCompanyName } from '@/lib/company-name';

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
      companyName={getDisplayCompanyName(session.user.name, session.user.email)} 
      user={{
        id: session.user.id,
        role: session.user.role as string | undefined,
        vipExpiresAt: session.user.vipExpiresAt ? new Date(session.user.vipExpiresAt) : null,
      }}
    />
  );
}
