'use client';

import type { JSX } from 'react';
import { useDeferredValue, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCcw, Search } from 'lucide-react';
import { forceResetInviteLinkForUser } from '@/app/actions/admin';

type AdminInviteUser = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  createdAt: string | Date;
};

type NoticeTone = 'success' | 'error';

function formatUserCreatedAt(value: string | Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function getResetErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '邀请链接重置失败，请稍后重试。';

  if (message === 'INVITER_EMAIL_NOT_VERIFIED') {
    return '该用户尚未完成邮箱验证，当前不能生成或重置邀请链接。';
  }

  if (message === 'INVITER_NOT_FOUND') {
    return '没有找到对应用户，可能已被删除。';
  }

  return message;
}

export function AdminInviteUserTable({ users }: { users: AdminInviteUser[] }): JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<NoticeTone>('success');
  const [isPending, startTransition] = useTransition();

  const filteredUsers = users.filter((user) => {
    if (!deferredQuery) {
      return true;
    }

    const haystacks = [user.name ?? '', user.email].map((item) => item.toLowerCase());
    return haystacks.some((value) => value.includes(deferredQuery));
  });

  const handleReset = (user: AdminInviteUser) => {
    setPendingUserId(user.id);
    setNotice('');

    startTransition(async () => {
      try {
        const inviteLink = await forceResetInviteLinkForUser(user.id);
        const displayName = user.name?.trim() || user.email;

        setNotice(`${displayName} 的邀请链接已重置，新邀请码为 ${inviteLink.code}。`);
        setNoticeTone('success');
        router.refresh();
      } catch (error) {
        setNotice(getResetErrorMessage(error));
        setNoticeTone('error');
      } finally {
        setPendingUserId(null);
      }
    });
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">用户邀请链接</h2>
          <p className="text-sm text-gray-500 mt-1">支持按公司名或邮箱检索，并强制为指定用户轮换新的邀请链接。</p>
        </div>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索公司名或邮箱"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>

        {notice ? (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              noticeTone === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {notice}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-medium">
            <tr>
              <th className="px-6 py-4">用户</th>
              <th className="px-6 py-4">邮箱验证</th>
              <th className="px-6 py-4">注册时间</th>
              <th className="px-6 py-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((user) => {
              const isCurrentRowPending = isPending && pendingUserId === user.id;

              return (
                <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{user.name?.trim() || '未命名'}</span>
                      <span className="text-xs text-gray-500">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.emailVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {user.emailVerified ? '已验证' : '未验证'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatUserCreatedAt(user.createdAt)}</td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => handleReset(user)}
                      disabled={isCurrentRowPending || !user.emailVerified}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCurrentRowPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                      强制重置
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                  没有匹配的用户。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
