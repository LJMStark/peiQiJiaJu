'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { signUp } from '@/lib/auth-client';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import {
  getCompanyNameValidationError,
  MAX_COMPANY_NAME_LENGTH,
  normalizeCompanyNameInput,
} from '@/lib/company-name';

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const companyNameError = getCompanyNameValidationError(companyName);
    if (companyNameError) {
      setError(companyNameError);
      return;
    }

    const normalizedCompanyName = normalizeCompanyNameInput(companyName);

    if (password.length < 8) {
      setError('密码至少需要 8 位。');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致。');
      return;
    }

    startTransition(async () => {
      const response = await signUp.email({
        name: normalizedCompanyName,
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.error) {
        setError(getAuthErrorMessage(response.error.code, response.error.message));
        return;
      }

      router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-zinc-700 mb-2">
          公司名称
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Building2 size={18} className="text-zinc-400" />
          </div>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            maxLength={MAX_COMPANY_NAME_LENGTH}
            placeholder="例如：某某家具有限公司"
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all bg-white"
            required
          />
        </div>
      </div>

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
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-2">
          设置密码
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Lock size={18} className="text-zinc-400" />
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位"
            className="w-full pl-11 pr-11 py-3.5 rounded-xl border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all bg-white"
            required
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700 mb-2">
          确认密码
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Lock size={18} className="text-zinc-400" />
          </div>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="再次输入密码"
            className="w-full pl-11 pr-11 py-3.5 rounded-xl border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all bg-white"
            required
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
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
            注册并发送验证邮件
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>

      <p className="text-sm text-zinc-500 text-center leading-6">
        注册成功后需要先完成邮箱验证，验证通过后才能进入工作台。
      </p>

      <p className="text-sm text-zinc-500 text-center">
        已有账号？
        <Link href="/signin" className="ml-2 font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
          直接登录
        </Link>
      </p>
    </form>
  );
}
