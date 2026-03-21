'use client';

import type { JSX } from 'react';
import { useEffect, useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Copy, Link2, Loader2, RefreshCcw } from 'lucide-react';
import { postJson, requestJson } from '@/lib/client/api';
import { resolveInviteCenterErrorState } from '@/lib/invite-center-error-state';

type InviteCenterResponse = {
  inviteUrl: string;
  code: string;
  stats: {
    registered: number;
    pending: number;
    verified: number;
  };
  recentReferrals: Array<{
    maskedEmail: string;
    maskedCompany: string;
    status: 'registered' | 'verified';
    attributedAt: string;
    verifiedAt: string | null;
  }>;
};

type InviteLinkResetResponse = {
  inviteUrl: string;
  code: string;
};

type NoticeTone = 'success' | 'error';

function formatInviteTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function formatReferralStatus(status: 'registered' | 'verified') {
  if (status === 'verified') {
    return {
      label: '已验证',
      className: 'bg-emerald-100 text-emerald-700',
    };
  }

  return {
    label: '待验证',
    className: 'bg-amber-100 text-amber-700',
  };
}

function getNoticeClassName(tone: NoticeTone): string {
  if (tone === 'success') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border border-rose-200 bg-rose-50 text-rose-700';
}

async function requestInviteCenterData(): Promise<InviteCenterResponse> {
  return requestJson<InviteCenterResponse>('/api/invitations/me', { cache: 'no-store' });
}

export function InviteCenter(): JSX.Element {
  const [data, setData] = useState<InviteCenterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<NoticeTone>('success');
  const [isResetPending, startResetTransition] = useTransition();

  useEffect(() => {
    let isCancelled = false;

    const loadInviteCenter = async () => {
      setIsLoading(true);
      setError('');

      try {
        const payload = await requestInviteCenterData();
        if (!isCancelled) {
          setData(payload);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : '邀请中心加载失败，请稍后重试。');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInviteCenter();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleReload = async () => {
    setIsLoading(true);
    setError('');

    try {
      const payload = await requestInviteCenterData();
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '邀请中心加载失败，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!data) {
      return;
    }

    try {
      await navigator.clipboard.writeText(data.inviteUrl);
      setNotice('邀请链接已复制，可以直接发给客户或合作伙伴。');
      setNoticeTone('success');
    } catch {
      setNotice('当前环境不支持自动复制，请手动复制上方链接。');
      setNoticeTone('error');
    }
  };

  const handleReset = () => {
    setNotice('');

    startResetTransition(async () => {
      try {
        const payload = await postJson<InviteLinkResetResponse>('/api/invitations/me/reset');

        setData((current) =>
          current
            ? {
                ...current,
                inviteUrl: payload.inviteUrl,
                code: payload.code,
              }
            : current
        );
        setNotice('邀请链接已重置，旧链接会立即失效。');
        setNoticeTone('success');
      } catch (resetError) {
        setNotice(resetError instanceof Error ? resetError.message : '邀请链接重置失败，请稍后再试。');
        setNoticeTone('error');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-10 flex items-center justify-center gap-3 text-zinc-500">
        <Loader2 size={20} className="animate-spin" />
        正在载入邀请数据...
      </div>
    );
  }

  if (error || !data) {
    const errorState = resolveInviteCenterErrorState(error);

    return (
      <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-12 shadow-sm sm:px-10">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
            <AlertTriangle size={28} />
          </div>
          <p className="text-sm font-medium tracking-[0.18em] text-rose-500">邀请链接</p>
          <h2 className="mt-3 text-2xl font-bold text-zinc-900">{errorState.title}</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base">
            {errorState.message}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void handleReload()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              <RefreshCcw size={16} />
              重新加载
            </button>
          </div>

          {errorState.details ? (
            <details className="mt-6 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left">
              <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                查看技术细节
              </summary>
              <p className="mt-3 break-words text-xs leading-6 text-zinc-500">{errorState.details}</p>
            </details>
          ) : null}
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: '已注册',
      value: data.stats.registered,
      valueClassName: 'text-zinc-900',
      description: '已被邀请并完成注册的账号数',
    },
    {
      title: '待验证',
      value: data.stats.pending,
      valueClassName: 'text-amber-600',
      description: '还没有完成邮箱验证的邀请记录',
    },
    {
      title: '已验证',
      value: data.stats.verified,
      valueClassName: 'text-emerald-600',
      description: '已经完成最终转化的有效邀请',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="bg-gradient-to-r from-sky-600 via-cyan-500 to-emerald-500 px-8 py-8 text-white">
          <div className="max-w-3xl space-y-2">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Link2 size={30} />
              邀请链接
            </h2>
            <p className="text-white/90 leading-7">
              分享你的专属邀请链接，新用户注册后会自动归因到你的账号下。完成邮箱验证后，记录会更新为有效转化。
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <p className="text-sm font-medium text-zinc-500">我的邀请链接</p>
                <div className="flex items-center gap-2 text-zinc-900">
                  <Link2 size={18} className="text-sky-600 shrink-0" />
                  <p className="font-medium break-all">{data.inviteUrl}</p>
                </div>
                <p className="text-xs text-zinc-500">邀请码：{data.code}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  <Copy size={16} />
                  复制链接
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isResetPending}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResetPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                  重置链接
                </button>
              </div>
            </div>

            {notice ? (
              <div className={`rounded-xl px-4 py-3 text-sm ${getNoticeClassName(noticeTone)}`}>
                {notice}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {statsCards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-sm text-zinc-500">{card.title}</p>
                <p className={`mt-3 text-3xl font-bold ${card.valueClassName}`}>{card.value}</p>
                <p className="mt-2 text-sm text-zinc-500">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">最近邀请记录</h3>
            <p className="text-sm text-zinc-500 mt-1">仅展示脱敏后的邮箱和公司名称。</p>
          </div>
        </div>

        {data.recentReferrals.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-500">
            还没有邀请记录。复制上方链接后分享给需要注册的新用户即可开始累计数据。
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {data.recentReferrals.map((referral) => {
              const status = formatReferralStatus(referral.status);

              return (
                <div
                  key={`${referral.maskedEmail}-${referral.attributedAt}`}
                  className="px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-900">{referral.maskedEmail}</p>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      公司：{referral.maskedCompany === '***' ? '未填写' : referral.maskedCompany}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 text-sm text-zinc-500 md:items-end">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={14} />
                      注册归因：{formatInviteTime(referral.attributedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      验证完成：{formatInviteTime(referral.verifiedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
