'use client';

import { AuthShell } from '@/components/auth/AuthShell';
import { useState, useTransition, Suspense } from 'react';
import { Lock, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  showPassword: boolean;
  onToggleShowPassword: () => void;
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  showPassword,
  onToggleShowPassword,
}: PasswordInputProps): React.ReactElement {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Lock size={18} className="text-zinc-400" />
        </div>
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-11 py-3.5 rounded-xl border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all bg-white"
          required
          minLength={8}
        />
        <button
          type="button"
          aria-label={showPassword ? `隐藏${label}` : `显示${label}`}
          onClick={onToggleShowPassword}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function ResetPasswordForm(): React.ReactElement | null {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const queryError = searchParams.get('error');

  const [isPending, startTransition] = useTransition();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(queryError === 'INVALID_TOKEN' ? '该重置链接无效或已过期，请重新请求。' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('请输入新密码并确认。');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次填写的密码不一致。');
      return;
    }

    if (newPassword.length < 8) {
      setError('密码至少需要 8 个字符。');
      return;
    }

    if (!token) {
      setError('缺少必要的重置令牌，请通过邮件中的链接访问此页面。');
      return;
    }

    startTransition(async () => {
      const response = await (authClient as any).resetPassword({
        newPassword,
        token,
      });

      if (response.error) {
        setError(getAuthErrorMessage(response.error.code, '重置密码失败，请稍后重试或重新发送重置链接。'));
        return;
      }

      // 密码重置成功，跳转至登录页
      router.push('/signin?reset_success=true');
    });
  };

  if (!token && !queryError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-pretty text-amber-900 mt-4">
        请通过密码重置邮件中的专属链接访问此页面。
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PasswordInput
        id="newPassword"
        label="新密码"
        value={newPassword}
        onChange={setNewPassword}
        placeholder="至少 8 位"
        showPassword={showPassword}
        onToggleShowPassword={() => setShowPassword((prev) => !prev)}
      />

      <PasswordInput
        id="confirmPassword"
        label="确认新密码"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="请再次填写新密码"
        showPassword={showConfirmPassword}
        onToggleShowPassword={() => setShowConfirmPassword((prev) => !prev)}
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-pretty text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || (!token && queryError !== null)}
        className="w-full bg-zinc-900 text-white font-medium py-3.5 px-4 rounded-xl hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            确认重置
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>

      <p className="text-sm text-pretty text-zinc-500 text-center flex items-center justify-center gap-1">
        <ArrowLeft size={16} />
        <Link href="/signin" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
          返回登录界面
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage(): React.ReactElement {
  return (
    <AuthShell
      badge="安全设置"
      title="设置新密码"
      description="请为你账号设置一个新的登录密码。尽量使用包含字母、数字甚至特殊符号的安全组合。"
    >
      <Suspense fallback={
        <div className="flex justify-center p-8">
          <div className="size-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
