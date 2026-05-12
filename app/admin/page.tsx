import {
  getDashboardStats,
  getUsersList,
  getDashboardTrends,
  getVipStats,
  getRedemptionStats,
  getGenerationLeaderboard,
  getGenerationSuccessStats,
  getCohortRetention,
} from '@/app/actions/admin';
import {
  Users,
  Activity,
  UserPlus,
  Image as ImageIcon,
  Crown,
  Ticket,
  Trophy,
  TrendingUp,
  CheckCircle2,
  CalendarRange,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { formatBeijingDateTime } from '@/lib/beijing-time';
import { isAdminRole } from './admin-shared';
import { DashboardTrendChart, type TrendPoint } from '@/components/admin/DashboardTrendChart';

export const dynamic = 'force-dynamic';

function formatDate(date: string | Date | null | undefined) {
  if (!date) return '-';
  return formatBeijingDateTime(date);
}

type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
type UserListRow = Awaited<ReturnType<typeof getUsersList>>[number];
type VipStats = Awaited<ReturnType<typeof getVipStats>>;
type RedemptionStats = Awaited<ReturnType<typeof getRedemptionStats>>;
type LeaderboardRow = Awaited<ReturnType<typeof getGenerationLeaderboard>>[number];
type SuccessStats = Awaited<ReturnType<typeof getGenerationSuccessStats>>;
type CohortRetention = Awaited<ReturnType<typeof getCohortRetention>>;

const EMPTY_DASHBOARD_STATS: DashboardStats = {
  totalUsers: 0,
  newUsers: 0,
  dau: 0,
  totalGenerations: 0,
};

const EMPTY_VIP_STATS: VipStats = {
  activeVip: 0,
  expiredVip: 0,
  nonVip: 0,
  verifiedUsers: 0,
  unverifiedUsers: 0,
};

const EMPTY_REDEMPTION_STATS: RedemptionStats = {
  total: 0,
  used: 0,
  active: 0,
  other: 0,
  usedThisMonth: 0,
  usedLast7d: 0,
  byDays: [],
};

const EMPTY_SUCCESS_STATS: SuccessStats = {
  days: 30,
  totalSuccess: 0,
  totalFailure: 0,
  total: 0,
  successRate: null,
  byErrorCode: [],
};

const EMPTY_RETENTION: CohortRetention = {
  weeks: 8,
  cohorts: [],
};

async function settle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error('[admin dashboard] section load failed:', error);
    return fallback;
  }
}

export default async function AdminDashboardPage() {
  const session = await getServerSession();

  if (!session || !isAdminRole(session.user.role)) {
    redirect('/');
  }

  const [
    stats,
    users,
    trendPoints,
    vipStats,
    redemptionStats,
    leaderboard,
    successStats,
    retention,
  ] = await Promise.all([
    settle<DashboardStats>(getDashboardStats(), EMPTY_DASHBOARD_STATS),
    settle<UserListRow[]>(getUsersList(), []),
    settle<TrendPoint[]>(getDashboardTrends(30), []),
    settle<VipStats>(getVipStats(), EMPTY_VIP_STATS),
    settle<RedemptionStats>(getRedemptionStats(), EMPTY_REDEMPTION_STATS),
    settle<LeaderboardRow[]>(getGenerationLeaderboard(10), []),
    settle<SuccessStats>(getGenerationSuccessStats(30), EMPTY_SUCCESS_STATS),
    settle<CohortRetention>(getCohortRetention(8), EMPTY_RETENTION),
  ]);

  const statCards = [
    {
      title: '总用户数',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '日活 (DAU)',
      value: stats.dau,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '今日新增',
      value: stats.newUsers,
      icon: UserPlus,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: '总生成次数',
      value: stats.totalGenerations,
      icon: ImageIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  const redemptionUsageRate =
    redemptionStats.total > 0
      ? Math.round((redemptionStats.used / redemptionStats.total) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">数据看板</h1>
        <p className="text-sm text-gray-500 mt-1">系统核心运行数据及用户列表</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4 shadow-sm">
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

      {/* 30 天趋势 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">最近 30 天趋势</h2>
            <p className="text-xs text-gray-500 mt-0.5">按北京时间统计每日注册数与生成数</p>
          </div>
        </div>
        <DashboardTrendChart points={trendPoints} />
      </div>

      {/* VIP / 兑换码 / Top 用户 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* VIP 构成 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">VIP 构成</h2>
              <p className="text-xs text-gray-500 mt-0.5">用户付费 / 验证状态分布</p>
            </div>
          </div>
          <dl className="px-6 py-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500">当前 VIP</dt>
              <dd className="mt-1 text-xl font-semibold text-emerald-600">{vipStats.activeVip}</dd>
            </div>
            <div>
              <dt className="text-gray-500">VIP 已过期</dt>
              <dd className="mt-1 text-xl font-semibold text-red-500">{vipStats.expiredVip}</dd>
            </div>
            <div>
              <dt className="text-gray-500">从未付费</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-700">{vipStats.nonVip}</dd>
            </div>
            <div>
              <dt className="text-gray-500">邮箱已验证</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-700">
                {vipStats.verifiedUsers}
                <span className="ml-1 text-xs text-gray-400">/ 未验证 {vipStats.unverifiedUsers}</span>
              </dd>
            </div>
          </dl>
        </div>

        {/* 兑换码 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100">
              <Ticket className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">兑换码</h2>
              <p className="text-xs text-gray-500 mt-0.5">使用率 {redemptionUsageRate}%（已用 / 总数）</p>
            </div>
          </div>
          <dl className="px-6 py-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500">总发放</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900">{redemptionStats.total}</dd>
            </div>
            <div>
              <dt className="text-gray-500">已使用</dt>
              <dd className="mt-1 text-xl font-semibold text-emerald-600">{redemptionStats.used}</dd>
            </div>
            <div>
              <dt className="text-gray-500">本月兑换</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900">{redemptionStats.usedThisMonth}</dd>
            </div>
            <div>
              <dt className="text-gray-500">近 7 天兑换</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900">{redemptionStats.usedLast7d}</dd>
            </div>
          </dl>
          {redemptionStats.byDays.length > 0 ? (
            <div className="border-t border-gray-100 px-6 py-4 text-xs text-gray-500 space-y-1.5">
              {redemptionStats.byDays.map((row) => {
                const rate =
                  row.total > 0 ? Math.round((row.used / row.total) * 100) : 0;
                return (
                  <div key={row.days} className="flex justify-between">
                    <span>{row.days} 天卡</span>
                    <span className="text-gray-700">
                      {row.used} / {row.total}
                      <span className="ml-2 text-gray-400">{rate}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* 重度用户 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100">
              <Trophy className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">近 30 天 Top 用户</h2>
              <p className="text-xs text-gray-500 mt-0.5">按生成次数排序</p>
            </div>
          </div>
          <ol className="divide-y divide-gray-100 text-sm">
            {leaderboard.map((user, index) => {
              const isActiveVip =
                user.vipExpiresAt && new Date(user.vipExpiresAt) > new Date();
              return (
                <li
                  key={user.id}
                  className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50/60"
                >
                  <span className="w-6 text-xs font-medium text-gray-400 tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium truncate">
                      {user.name || '未命名'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">
                      {user.generationCount}
                    </p>
                    <p className={`text-xs ${isActiveVip ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {isActiveVip ? 'VIP' : '非 VIP'}
                    </p>
                  </div>
                </li>
              );
            })}
            {leaderboard.length === 0 ? (
              <li className="px-6 py-10 text-center text-gray-500">暂无生成数据。</li>
            ) : null}
          </ol>
        </div>
      </div>

      {/* 生成成功率 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">最近 {successStats.days} 天生成成功率</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {successStats.total === 0
                ? '尚无生成数据，或失败采集表未迁移（运行 npm run generation-telemetry:migrate）。'
                : `成功 ${successStats.totalSuccess} 次 · 失败 ${successStats.totalFailure} 次`}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="px-6 py-5">
            <p className="text-sm text-gray-500">成功率</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900 tabular-nums">
              {successStats.successRate == null ? '—' : `${successStats.successRate.toFixed(2)}%`}
            </p>
            {successStats.total > 0 ? (
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${Math.max(0, Math.min(100, successStats.successRate ?? 0))}%`,
                  }}
                />
              </div>
            ) : null}
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-gray-500">成功 / 失败</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">
              {successStats.totalSuccess}
              <span className="mx-2 text-gray-300">/</span>
              <span className="text-red-500">{successStats.totalFailure}</span>
            </p>
            <p className="mt-3 text-xs text-gray-500">
              共 {successStats.total} 次请求
            </p>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-gray-500">失败原因 Top</p>
            {successStats.byErrorCode.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">暂无失败记录</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {successStats.byErrorCode.map((row) => (
                  <li
                    key={`${row.errorCode ?? 'unknown'}-${row.count}`}
                    className="flex justify-between items-center text-gray-700"
                  >
                    <span className="truncate font-mono text-xs">
                      {row.errorCode || 'UNKNOWN'}
                    </span>
                    <span className="ml-3 tabular-nums font-medium">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 周留存矩阵 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100">
            <CalendarRange className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">周留存矩阵</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              按注册周分组，统计各周内至少有一次生成的用户占比（最近 {retention.weeks} 周）
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {retention.cohorts.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              暂无 cohort 数据。
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap">注册周</th>
                  <th className="px-3 py-3 text-right">人数</th>
                  {Array.from({ length: retention.weeks }, (_, i) => (
                    <th key={i} className="px-3 py-3 text-center whitespace-nowrap">
                      W{i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {retention.cohorts.map((cohort) => (
                  <tr key={cohort.cohortWeek} className="hover:bg-gray-50/40">
                    <td className="px-6 py-3 whitespace-nowrap font-medium text-gray-900">
                      {cohort.cohortWeek}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                      {cohort.size}
                    </td>
                    {cohort.offsets.map((cell) => {
                      const rate = cell.rate;
                      const intensity =
                        rate == null ? 0 : Math.min(1, rate / 100);
                      const bg =
                        rate == null
                          ? 'transparent'
                          : `rgba(124, 58, 237, ${0.08 + intensity * 0.55})`;
                      const textColor =
                        intensity >= 0.6 ? 'text-white' : 'text-gray-800';
                      return (
                        <td
                          key={cell.weekOffset}
                          className="px-3 py-3 text-center tabular-nums"
                        >
                          {rate == null ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <span
                              className={`inline-flex items-center justify-center min-w-[3.25rem] px-2 py-1 rounded ${textColor}`}
                              style={{ backgroundColor: bg }}
                              title={`${cell.retained} / ${cohort.size}`}
                            >
                              {rate}%
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">最近注册用户 (Top 50)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-4">用户</th>
                <th className="px-6 py-4">角色</th>
                <th className="px-6 py-4">注册时间</th>
                <th className="px-6 py-4">最后活跃</th>
                <th className="px-6 py-4">生成次数</th>
                <th className="px-6 py-4">VIP 到期</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{user.name || '未命名'}</span>
                      <span className="text-xs text-gray-500">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}
                    `}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(user.lastLogin)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{user.generationCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.vipExpiresAt ? (
                      new Date(user.vipExpiresAt) > new Date() ? (
                        <span className="text-green-600 font-medium">{formatDate(user.vipExpiresAt)}</span>
                      ) : (
                        <span className="text-red-500">已过期</span>
                      )
                    ) : (
                      <span className="text-gray-400">非 VIP</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    暂无用户数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
