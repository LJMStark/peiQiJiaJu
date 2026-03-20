import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { getServerSession, isSessionEmailVerified } from '@/lib/auth';
import { INVITE_DASHBOARD_PATH } from '@/lib/invitations';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string }>;
}) {
  const session = await getServerSession();
  const resolvedSearchParams = await searchParams;
  const isInvitedSignup = resolvedSearchParams.invited === '1';

  if (session) {
    if (!isSessionEmailVerified(session)) {
      const callbackQuery = isInvitedSignup ? `&callbackURL=${encodeURIComponent(INVITE_DASHBOARD_PATH)}` : '';
      redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}${callbackQuery}`);
    }

    redirect(isInvitedSignup ? INVITE_DASHBOARD_PATH : '/');
  }

  return (
    <AuthShell
      badge="注册账号"
      title="创建你的账号"
      description="几秒钟完成注册，开始上传家具、保存空间效果，并管理你的项目。"
    >
      <SignUpForm />
    </AuthShell>
  );
}
