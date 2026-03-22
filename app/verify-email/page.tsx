'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Mail, RefreshCw, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { sendVerificationEmail } from '@/lib/auth-client';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { INVITE_DASHBOARD_PATH } from '@/lib/invitations';

type PageStatus = 'idle' | 'resending' | 'sent';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') ?? '';
  const callbackURL = searchParams.get('callbackURL') ?? '/';
  const cameFromInvite = callbackURL === INVITE_DASHBOARD_PATH;

  const [email, setEmail] = useState(emailFromQuery);
  const [status, setStatus] = useState<PageStatus>('idle');
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email.trim()) {
      setError('请输入您注册时使用的邮箱地址。');
      return;
    }

    setError('');
    setStatus('resending');

    const response = await sendVerificationEmail({
      email: email.trim().toLowerCase(),
      callbackURL,
    });

    if (response.error) {
      setError(getAuthErrorMessage(response.error.code, '验证邮件发送失败，请稍后重试。'));
      setStatus('idle');
      return;
    }

    setStatus('sent');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 mb-6">
            <Mail size={28} />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-3">请验证您的邮箱</h1>
          <p className="text-zinc-500 leading-7">
            我们已向您的邮箱发送了一封验证邮件。
            <br />
            请点击邮件中的链接完成验证。
          </p>
          {cameFromInvite ? (
            <p className="mt-3 text-sm text-indigo-600">验证完成后会自动跳回会员中心。</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
          <div>
            <label htmlFor="verify-email" className="block text-sm font-medium text-zinc-700 mb-2">
              邮箱地址
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={18} className="text-zinc-400" />
              </div>
              <input
                id="verify-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all bg-white"
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {status === 'sent' ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle size={16} />
              验证邮件已重新发送，请查收邮箱。
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleResend}
            disabled={status === 'resending'}
            className="w-full border border-indigo-200 bg-indigo-50 text-indigo-700 font-medium py-3 px-4 rounded-xl hover:bg-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === 'resending' ? (
              <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            ) : (
              <>
                <RefreshCw size={16} />
                重新发送验证邮件
              </>
            )}
          </button>

          <div className="text-sm text-zinc-500 space-y-2">
            <p>没有收到邮件？请检查垃圾邮件文件夹。</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <Link
            href="/signin"
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            <ArrowLeft size={14} />
            返回登录
          </Link>
          <Link
            href={cameFromInvite ? '/signup?invited=1' : '/signup'}
            className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
          >
            重新注册
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
