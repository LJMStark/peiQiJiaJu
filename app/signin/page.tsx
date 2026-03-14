import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignInForm } from '@/components/auth/SignInForm';
import { getServerSession, isSessionEmailVerified } from '@/lib/auth';

export default async function SignInPage() {
  const session = await getServerSession();

  if (session) {
    if (!isSessionEmailVerified(session)) {
      redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
    }

    redirect('/');
  }

  return (
    <AuthShell
      badge="邮箱登录"
      title="欢迎回来"
      description="输入邮箱和密码，进入你的家具工作台，继续管理图册与空间效果。"
    >
      <SignInForm />
    </AuthShell>
  );
}
