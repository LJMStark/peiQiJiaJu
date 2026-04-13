import { getAdminInvitationSummary, getUsersList } from '@/app/actions/admin';
import { AlertTriangle, Link2, MailCheck, TerminalSquare, UserPlus } from 'lucide-react';
import { formatBeijingDateTime } from '@/lib/beijing-time';
import { AdminInviteUserTable } from '@/components/admin/AdminInviteUserTable';
import { resolveAdminInvitationErrorState } from '@/lib/invite-center-error-state';

export const dynamic = 'force-dynamic';

async function loadAdminInvitationsPageData() {
  try {
    const [summary, users] = await Promise.all([
      getAdminInvitationSummary(),
      getUsersList(500, 0),
    ]);

    return {
      summary,
      users,
      errorState: null,
    };
  } catch (error) {
    console.error('[admin invitations] failed to load invitation summary:', error);

    return {
      summary: null,
      users: null,
      errorState: resolveAdminInvitationErrorState(error),
    };
  }
}

function formatDateTime(value: string | Date | null) {
  if (!value) {
    return '-';
  }

  return formatBeijingDateTime(value);
}

function getReferralStatusStyle(status: 'registered' | 'verified') {
  if (status === 'verified') {
    return 'bg-emerald-100 text-emerald-700';
  }

  return 'bg-amber-100 text-amber-700';
}

export default async function AdminInvitationsPage() {
  const pageData = await loadAdminInvitationsPageData();

  if (pageData.errorState) {
    const { errorState } = pageData;

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">邀请管理</h1>
          <p className="text-sm text-gray-500 mt-1">查看邀请转化表现，并为指定用户强制轮换新的邀请链接。</p>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white px-6 py-12 shadow-sm sm:px-10">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm">
              <AlertTriangle size={28} />
            </div>
            <p className="text-sm font-medium tracking-[0.18em] text-amber-600">邀请管理</p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900">{errorState.title}</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">{errorState.message}</p>

            {errorState.setupCommand ? (
              <div className="mt-6 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-left">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <TerminalSquare size={16} />
                  初始化命令
                </div>
                <code className="mt-3 block rounded-xl bg-gray-900 px-4 py-3 text-sm text-gray-100">
                  {errorState.setupCommand}
                </code>
                <p className="mt-3 text-xs leading-6 text-gray-500">
                  运行完成后，请重新部署或重启当前服务实例，再刷新本页面。
                </p>
              </div>
            ) : null}

            {errorState.details ? (
              <details className="mt-6 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">查看技术细节</summary>
                <p className="mt-3 break-words text-xs leading-6 text-gray-500">{errorState.details}</p>
              </details>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  const { summary, users } = pageData;
  if (!summary || !users) {
    throw new Error('Admin invitations page data is missing.');
  }

  const statCards = [
    {
      title: '活跃邀请链接',
      value: summary.totals.activeLinks,
      icon: Link2,
      color: 'text-sky-600',
      bgColor: 'bg-sky-100',
    },
    {
      title: '已注册邀请',
      value: summary.totals.registeredReferrals,
      icon: UserPlus,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: '已验证邀请',
      value: summary.totals.verifiedReferrals,
      icon: MailCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">邀请管理</h1>
        <p className="text-sm text-gray-500 mt-1">查看邀请转化表现，并为指定用户强制轮换新的邀请链接。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <div key={stat.title} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4 shadow-sm">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top 邀请人</h2>
            <p className="text-sm text-gray-500 mt-1">按已验证转化优先排序。</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">邀请人</th>
                  <th className="px-6 py-4">已验证</th>
                  <th className="px-6 py-4">总邀请</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.topInviters.map((inviter) => (
                  <tr key={inviter.inviterUserId} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{inviter.inviterName}</span>
                        <span className="text-xs text-gray-500">{inviter.inviterEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-emerald-600">{inviter.verifiedReferrals}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{inviter.totalReferrals}</td>
                  </tr>
                ))}

                {summary.topInviters.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                      暂无邀请排行数据。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">最近转化</h2>
            <p className="text-sm text-gray-500 mt-1">展示最近发生的邀请注册和验证记录。</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">邀请人</th>
                  <th className="px-6 py-4">被邀请人</th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4">归因时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.recentReferrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{referral.inviterName}</span>
                        <span className="text-xs text-gray-500">{referral.inviterEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{referral.inviteeEmail}</span>
                        <span className="text-xs text-gray-500">{referral.inviteeCompany || '未填写公司名称'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getReferralStatusStyle(referral.status)}`}
                      >
                        {referral.status === 'verified' ? '已验证' : '待验证'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{formatDateTime(referral.attributedAt)}</span>
                        <span className="text-xs text-gray-500">验证：{formatDateTime(referral.verifiedAt)}</span>
                      </div>
                    </td>
                  </tr>
                ))}

                {summary.recentReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      暂无最近转化记录。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AdminInviteUserTable
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: Boolean(user.emailVerified),
          createdAt: user.createdAt,
        }))}
      />
    </div>
  );
}
