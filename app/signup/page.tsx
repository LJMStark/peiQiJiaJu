import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { getServerSession } from '@/lib/auth';

export default async function SignUpPage() {
  const session = await getServerSession();

  if (session) {
    redirect('/');
  }

  return (
    <AuthShell
      badge="企业注册"
      title="创建你的企业账号"
      description="先把邮箱密码注册打通，这一步完成后，后续的 Google 登录、支付和积分系统都能直接挂在同一套用户体系上。"
    >
      <SignUpForm />
    </AuthShell>
  );
}
