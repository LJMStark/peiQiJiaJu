import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignInForm } from '@/components/auth/SignInForm';
import { getServerSession } from '@/lib/auth';

export default async function SignInPage() {
  const session = await getServerSession();

  if (session) {
    redirect('/');
  }

  return (
    <AuthShell
      badge="邮箱登录"
      title="欢迎回来"
      description="输入邮箱和密码，进入你的家具工作台。接下来我们会在这套账号体系上继续接 Google 登录和支付。"
    >
      <SignInForm />
    </AuthShell>
  );
}
