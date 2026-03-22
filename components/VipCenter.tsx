'use client';

import type { JSX } from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, CheckCircle2, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { InviteCenter } from '@/components/InviteCenter';
import { formatBeijingDate } from '@/lib/beijing-time';
import { postJson } from '@/lib/client/api';
import { formatRedemptionCode } from '@/lib/redemption-codes';

type VipCenterProps = {
  user: {
    id: string;
    role?: string;
    vipExpiresAt?: Date | string | null;
  };
};

function isVipActive(vipExpiresAt: Date | string | null | undefined): boolean {
  if (!vipExpiresAt) {
    return false;
  }

  return new Date(vipExpiresAt) > new Date();
}

function getRemainingVipDays(vipExpiresAt: Date | string | null | undefined): number {
  if (!isVipActive(vipExpiresAt) || !vipExpiresAt) {
    return 0;
  }

  const msDiff = new Date(vipExpiresAt).getTime() - Date.now();
  return Math.ceil(msDiff / (1000 * 60 * 60 * 24));
}

function getRedeemErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '兑换失败，请检查卡密是否正确';
}

export function VipCenter({ user }: VipCenterProps): JSX.Element {
  const [code, setCode] = useState('');
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setStatus('idle');
    startTransition(async () => {
      try {
        const result = await postJson<{ success: boolean; message: string }>('/api/vip/redeem', { code });
        if (result.success) {
          setStatus('success');
          setMessage(result.message);
          setCode('');
          router.refresh();
        }
      } catch (error) {
        setStatus('error');
        setMessage(getRedeemErrorMessage(error));
      }
    });
  };

  const isVip = isVipActive(user.vipExpiresAt);
  const daysLeft = getRemainingVipDays(user.vipExpiresAt);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-400 p-8 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-10">
            <Crown size={180} />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Crown size={32} />
                会员中心
              </h2>
              <p className="text-amber-50 text-lg opacity-90">会员状态、卡密兑换和邀请转化都集中在这一页管理</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-100 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">当前状态</h3>
              {isVip ? (
                <div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-4xl font-bold text-zinc-900">{daysLeft}</span>
                    <span className="text-zinc-500 mb-1">天剩余</span>
                  </div>
                  <div className="items-center gap-2 text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-lg inline-flex">
                    <CheckCircle2 size={16} />
                    <span>高级会员生效中</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-4">
                    <Calendar size={14} />
                    <span>到期时间：{formatBeijingDate(user.vipExpiresAt!)}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold text-zinc-900 mb-2">免费基础版</div>
                  <div className="items-center gap-2 text-sm text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg inline-flex">
                    <AlertCircle size={16} />
                    <span>开通会员解锁所有功能</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 mb-4">使用兑换卡密</h3>
              <form onSubmit={handleRedeem} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-zinc-700 mb-1.5">
                    请输入您的16位兑换码
                  </label>
                  <input
                    type="text"
                    id="code"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={code}
                    onChange={(e) => setCode(formatRedemptionCode(e.target.value))}
                    maxLength={19}
                    className="w-full border border-zinc-300 rounded-xl px-4 py-3 text-zinc-900 font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition uppercase tracking-wider bg-zinc-50 focus:bg-white"
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">支持直接粘贴带连字符或空格的兑换码。</p>
                </div>

                {status === 'error' && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{message}</span>
                  </div>
                )}

                {status === 'success' && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending || !code.trim()}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3 rounded-xl transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      正在验证...
                    </>
                  ) : (
                    '立即兑换'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <InviteCenter />

      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100">
        <h4 className="font-semibold text-indigo-900 mb-2">获取卡密途径</h4>
        <p className="text-sm text-indigo-700 leading-relaxed max-w-2xl">
          目前本平台处于内测阶段。若您想要获取会员兑换码，请联系管理员获取测试卡密。管理员可以在管理后台批量生成测试兑换码发放给指定用户。
        </p>
      </div>
    </div>
  );
}
