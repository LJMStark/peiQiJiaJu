'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ArrowRight, Lock, Mail, RefreshCw } from 'lucide-react';
import { signIn, sendVerificationEmail } from '@/lib/auth-client';
import { getAuthErrorMessage } from '@/lib/auth-errors';

export function SignInForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('请输入邮箱和密码。');
      return;
    }

    startTransition(async () => {
      const response = await signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.error) {
        const code = response.error.code;
        // 不再将所有 403 视为未验证，因为跨域 (Invalid Origin) 也可能返回 403
        if (code === 'EMAIL_NOT_VERIFIED') {
          setNeedsVerification(true);
          setError('您的邮箱尚未验证。请查收验证邮件，或点击下方按钮重新发送。');
          return;
        }

        setError(getAuthErrorMessage(code, response.error.message));
        return;
      }

      router.push('/');
      router.refresh();
    });
  };

  const handleResendVerification = async () => {
    setError('');
    setSuccess('');
    setIsResending(true);

    const response = await sendVerificationEmail({
      email: email.trim().toLowerCase(),
      callbackURL: '/',
    });

    setIsResending(false);

    if (response.error) {
      setError(getAuthErrorMessage(response.error.code, '验证邮件发送失败，请稍后重试。'));
      return;
    }

    setSuccess('验证邮件已重新发送，请查收邮箱。');
  };

  const isLoading = isPending || isResending;

  return (
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

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
            密码
          </label>
          <Link href="/forgot-password" tabIndex={-1} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
            忘记密码？
          </Link>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Lock size={18} className="text-zinc-400" />
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位"
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

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {needsVerification ? (
        <button
          type="button"
          onClick={handleResendVerification}
          disabled={isResending}
          className="w-full border border-indigo-200 bg-indigo-50 text-indigo-700 font-medium py-3 px-4 rounded-xl hover:bg-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isResending ? (
            <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          ) : (
            <>
              <RefreshCw size={16} />
              重新发送验证邮件
            </>
          )}
        </button>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-zinc-900 text-white font-medium py-3.5 px-4 rounded-xl hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            登录并进入工作台
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>

      <p className="text-sm text-zinc-500 text-center">
        还没有账号？
        <Link href="/signup" className="ml-2 font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
          前往注册
        </Link>
      </p>
    </form>
  );
}
