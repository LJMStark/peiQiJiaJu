'use client';

import type { JSX } from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { InviteCenter } from '@/components/InviteCenter';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { StatusNotice } from '@/components/ui/StatusNotice';
import { formatBeijingDate } from '@/lib/beijing-time';
import { postJson } from '@/lib/client/api';
import { formatRedemptionCode } from '@/lib/redemption-codes';

type VipCenterProps = {
  user: { id: string; role?: string; vipExpiresAt?: Date | string | null };
};

function isVipActive(vipExpiresAt: Date | string | null | undefined): boolean {
  return Boolean(vipExpiresAt && new Date(vipExpiresAt) > new Date());
}

function getRemainingVipDays(vipExpiresAt: Date | string | null | undefined): number {
  if (!isVipActive(vipExpiresAt) || !vipExpiresAt) return 0;
  return Math.ceil((new Date(vipExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function VipCenter({ user }: VipCenterProps): JSX.Element {
  const [code, setCode] = useState('');
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const isVip = isVipActive(user.vipExpiresAt);
  const daysLeft = getRemainingVipDays(user.vipExpiresAt);

  function handleRedeem(event: React.FormEvent): void {
    event.preventDefault();
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
        setMessage(error instanceof Error ? error.message : '兑换失败，请检查卡密是否正确。');
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[28px]">会员中心</h1>
        <p className="mt-1 text-sm leading-6 text-zinc-600 sm:text-base">查看会员期限、兑换卡密，也可以管理邀请链接。</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel className="p-5 sm:p-6">
          <p className="text-sm font-medium text-zinc-500">会员状态</p>
          {isVip ? (
            <div className="mt-5">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight text-zinc-900">{daysLeft}</span>
                <span className="pb-1 text-sm text-zinc-600">天剩余</span>
              </div>
              <span className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-lg bg-amber-100 px-3 text-sm font-medium text-amber-900">
                <CheckCircle2 aria-hidden="true" size={16} />
                会员生效中
              </span>
              <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
                <Calendar aria-hidden="true" size={15} />
                到期时间：{formatBeijingDate(user.vipExpiresAt!)}
              </p>
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-2xl font-semibold text-zinc-900">免费基础版</p>
              <p className="mt-3 text-sm leading-6 text-zinc-600">兑换会员卡密后即可更新账户期限。</p>
            </div>
          )}
        </Panel>

        <Panel className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">兑换会员</h2>
          <form onSubmit={handleRedeem} className="mt-4 space-y-4">
            <div>
              <label htmlFor="vip-code" className="mb-1.5 block text-sm font-medium text-zinc-700">16 位兑换码</label>
              <input
                id="vip-code"
                type="text"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={code}
                onChange={(event) => setCode(formatRedemptionCode(event.target.value))}
                maxLength={19}
                className="h-12 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 font-mono text-zinc-900 uppercase tracking-wider outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="mt-1.5 text-xs text-zinc-500">可以直接粘贴带连字符或空格的兑换码。</p>
            </div>
            {status === 'error' ? <StatusNotice tone="error">{message}</StatusNotice> : null}
            {status === 'success' ? <StatusNotice tone="success">{message}</StatusNotice> : null}
            <Button type="submit" disabled={!code.trim()} isLoading={isPending} loadingLabel="正在验证..." className="w-full">立即兑换</Button>
          </form>
        </Panel>
      </div>

      <InviteCenter />

      <StatusNotice tone="info" title="获取卡密">
        当前处于内测阶段，如需会员兑换码，请联系管理员获取测试卡密。
      </StatusNotice>
    </div>
  );
}
