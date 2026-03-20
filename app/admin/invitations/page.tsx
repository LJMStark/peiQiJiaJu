import { getAdminInvitationSummary, getUsersList } from '@/app/actions/admin';
import { Link2, MailCheck, UserPlus } from 'lucide-react';
import { formatBeijingDateTime } from '@/lib/beijing-time';
import { AdminInviteUserTable } from '@/components/admin/AdminInviteUserTable';

export const dynamic = 'force-dynamic';

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
  const [summary, users] = await Promise.all([
    getAdminInvitationSummary(),
    getUsersList(500, 0),
  ]);

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
