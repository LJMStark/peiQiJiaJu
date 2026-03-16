'use client';

import { AuthShell } from '@/components/auth/AuthShell';
import { useState, useTransition } from 'react';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('请输入邮箱。');
      return;
    }

    startTransition(async () => {
      // Typecasting below because of limitation in better-auth client types
      const response = await (authClient as any).forgetPassword({
        email: email.trim().toLowerCase(),
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (response.error) {
        setError(getAuthErrorMessage(response.error.code, '发送重置邮件失败，请稍后重试。'));
        return;
      }

      setSuccess(true);
    });
  };

  if (success) {
    return (
      <AuthShell
        badge="邮件已发送"
        title="重置链接已发送到你的邮箱"
        description="请检查你的收件箱，点击邮件中的链接以重置密码。如果你没有收到邮件，请检查垃圾邮件文件夹或者尝试重新发送。"
      >
        <div className="space-y-4">
          <Link
            href="/signin"
            className="w-full bg-zinc-900 text-white font-medium py-3.5 px-4 rounded-xl hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
          >
            返回登录
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      badge="忘记密码"
      title="重置你的密码"
      description="输入你注册时使用的邮箱地址，我们将向你发送一封包含重置密码链接的邮件。"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
            邮箱地址
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail size={18} className="text-zinc-400" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all bg-white"
              required
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-zinc-900 text-white font-medium py-3.5 px-4 rounded-xl hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              发送重置链接
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        <p className="text-sm text-zinc-500 text-center flex items-center justify-center gap-1">
          <ArrowLeft size={16} />
          <Link href="/signin" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
            返回登录界面
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
