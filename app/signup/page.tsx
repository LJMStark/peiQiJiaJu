import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { getServerSession, isSessionEmailVerified } from '@/lib/auth';

export default async function SignUpPage() {
  const session = await getServerSession();

  if (session) {
    if (!isSessionEmailVerified(session)) {
      redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
    }

    redirect('/');
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
