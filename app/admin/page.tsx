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
  AlertTriangle,
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

function readSettled<T>(result: PromiseSettledResult<T>, fallback: T, section: string) {
  if (result.status === 'fulfilled') {
    return { data: result.value, failed: false };
  }

  console.error(`[admin dashboard] ${section} load failed:`, result.reason);
  return { data: fallback, failed: true };
}

function SectionLoadError({ failed }: { failed: boolean }) {
  if (!failed) return null;

  return (
    <div role="alert" className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      这部分数据加载失败，其他数据不受影响。请稍后刷新重试。
    </div>
  );
}

export default async function AdminDashboardPage() {
  const session = await getServerSession();

  if (!session || !isAdminRole(session.user.role)) {
    redirect('/');
  }

  const [statsResult, usersResult, trendsResult, vipResult, redemptionResult, leaderboardResult, successResult, retentionResult] = await Promise.allSettled([
    getDashboardStats(),
    getUsersList(),
    getDashboardTrends(30),
    getVipStats(),
    getRedemptionStats(),
    getGenerationLeaderboard(10),
    getGenerationSuccessStats(30),
    getCohortRetention(8),
  ] as const);
  const statsSection = readSettled<DashboardStats>(statsResult, EMPTY_DASHBOARD_STATS, 'stats');
  const usersSection = readSettled<UserListRow[]>(usersResult, [], 'users');
  const trendsSection = readSettled<TrendPoint[]>(trendsResult, [], 'trends');
  const vipSection = readSettled<VipStats>(vipResult, EMPTY_VIP_STATS, 'vip');
  const redemptionSection = readSettled<RedemptionStats>(redemptionResult, EMPTY_REDEMPTION_STATS, 'redemption');
  const leaderboardSection = readSettled<LeaderboardRow[]>(leaderboardResult, [], 'leaderboard');
  const successSection = readSettled<SuccessStats>(successResult, EMPTY_SUCCESS_STATS, 'success');
  const retentionSection = readSettled<CohortRetention>(retentionResult, EMPTY_RETENTION, 'retention');
  const stats = statsSection.data;
  const users = usersSection.data;
  const trendPoints = trendsSection.data;
  const vipStats = vipSection.data;
  const redemptionStats = redemptionSection.data;
  const leaderboard = leaderboardSection.data;
  const successStats = successSection.data;
  const retention = retentionSection.data;
  const hasSectionFailure = [statsSection, usersSection, trendsSection, vipSection, redemptionSection, leaderboardSection, successSection, retentionSection].some((section) => section.failed);

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
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: '今日新增',
      value: stats.newUsers,
      icon: UserPlus,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: '总生成次数',
      value: stats.totalGenerations,
      icon: ImageIcon,
      color: 'text-amber-700',
      bgColor: 'bg-amber-100',
    },
  ];

  const redemptionUsageRate =
    redemptionStats.total > 0
      ? Math.round((redemptionStats.used / redemptionStats.total) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">数据看板</h1>
        <p className="text-sm text-zinc-500 mt-1">系统核心运行数据及用户列表</p>
      </div>

      {hasSectionFailure ? (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          部分数据加载失败。失败的数据块已单独标出，其余内容仍可正常查看。
        </div>
      ) : null}

      {/* Stats Cards */}
      <div className="space-y-3">
        <SectionLoadError failed={statsSection.failed} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-xl border border-zinc-200 p-6 flex items-center gap-4 shadow-sm">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500">{stat.title}</p>
                <p className="text-2xl font-semibold text-zinc-900 mt-1">{stat.value.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* 30 天趋势 */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">最近 30 天趋势</h2>
            <p className="text-xs text-zinc-500 mt-0.5">按北京时间统计每日注册数与生成数</p>
          </div>
        </div>
        <SectionLoadError failed={trendsSection.failed} />
        <DashboardTrendChart points={trendPoints} />
      </div>

      {/* VIP / 兑换码 / Top 用户 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* VIP 构成 */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">VIP 构成</h2>
              <p className="text-xs text-zinc-500 mt-0.5">用户付费 / 验证状态分布</p>
            </div>
          </div>
          <SectionLoadError failed={vipSection.failed} />
          <dl className="px-6 py-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-zinc-500">当前 VIP</dt>
              <dd className="mt-1 text-xl font-semibold text-emerald-600">{vipStats.activeVip}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">VIP 已过期</dt>
              <dd className="mt-1 text-xl font-semibold text-red-500">{vipStats.expiredVip}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">从未付费</dt>
              <dd className="mt-1 text-xl font-semibold text-zinc-700">{vipStats.nonVip}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">邮箱已验证</dt>
              <dd className="mt-1 text-xl font-semibold text-zinc-700">
                {vipStats.verifiedUsers}
                <span className="ml-1 text-xs text-zinc-400">/ 未验证 {vipStats.unverifiedUsers}</span>
              </dd>
            </div>
          </dl>
        </div>

        {/* 兑换码 */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100">
              <Ticket className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">兑换码</h2>
              <p className="text-xs text-zinc-500 mt-0.5">使用率 {redemptionUsageRate}%（已用 / 总数）</p>
            </div>
          </div>
          <SectionLoadError failed={redemptionSection.failed} />
          <dl className="px-6 py-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-zinc-500">总发放</dt>
              <dd className="mt-1 text-xl font-semibold text-zinc-900">{redemptionStats.total}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">已使用</dt>
              <dd className="mt-1 text-xl font-semibold text-emerald-600">{redemptionStats.used}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">本月兑换</dt>
              <dd className="mt-1 text-xl font-semibold text-zinc-900">{redemptionStats.usedThisMonth}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">近 7 天兑换</dt>
              <dd className="mt-1 text-xl font-semibold text-zinc-900">{redemptionStats.usedLast7d}</dd>
            </div>
          </dl>
          {redemptionStats.byDays.length > 0 ? (
            <div className="border-t border-zinc-100 px-6 py-4 text-xs text-zinc-500 space-y-1.5">
              {redemptionStats.byDays.map((row) => {
                const rate =
                  row.total > 0 ? Math.round((row.used / row.total) * 100) : 0;
                return (
                  <div key={row.days} className="flex justify-between">
                    <span>{row.days} 天卡</span>
                    <span className="text-zinc-700">
                      {row.used} / {row.total}
                      <span className="ml-2 text-zinc-400">{rate}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* 重度用户 */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <Trophy className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">近 30 天 Top 用户</h2>
              <p className="text-xs text-zinc-500 mt-0.5">按生成次数排序</p>
            </div>
          </div>
          <SectionLoadError failed={leaderboardSection.failed} />
          <ol className="divide-y divide-zinc-100 text-sm">
            {leaderboard.map((user, index) => {
              const isActiveVip =
                user.vipExpiresAt && new Date(user.vipExpiresAt) > new Date();
              return (
                <li
                  key={user.id}
                  className="px-6 py-3 flex items-center gap-3 hover:bg-zinc-50/60"
                >
                  <span className="w-6 text-xs font-medium text-zinc-400 tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-900 font-medium truncate">
                      {user.name || '未命名'}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{user.email || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                      {user.generationCount}
                    </p>
                    <p className={`text-xs ${isActiveVip ? 'text-emerald-600' : 'text-zinc-400'}`}>
                      {isActiveVip ? 'VIP' : '非 VIP'}
                    </p>
                  </div>
                </li>
              );
            })}
            {leaderboard.length === 0 ? (
              <li className="px-6 py-10 text-center text-zinc-500">暂无生成数据。</li>
            ) : null}
          </ol>
        </div>
      </div>

      {/* 生成成功率 */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">最近 {successStats.days} 天生成成功率</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {successStats.total === 0
                ? '尚无生成数据，或失败采集表未迁移（运行 npm run generation-telemetry:migrate）。'
                : `成功 ${successStats.totalSuccess} 次 · 失败 ${successStats.totalFailure} 次`}
            </p>
          </div>
        </div>
        <SectionLoadError failed={successSection.failed} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-zinc-100">
          <div className="px-6 py-5">
            <p className="text-sm text-zinc-500">成功率</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900 tabular-nums">
              {successStats.successRate == null ? '—' : `${successStats.successRate.toFixed(2)}%`}
            </p>
            {successStats.total > 0 ? (
              <div className="mt-3 h-2 bg-zinc-100 rounded-full overflow-hidden">
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
            <p className="text-sm text-zinc-500">成功 / 失败</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900 tabular-nums">
              {successStats.totalSuccess}
              <span className="mx-2 text-zinc-300">/</span>
              <span className="text-red-500">{successStats.totalFailure}</span>
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              共 {successStats.total} 次请求
            </p>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-zinc-500">失败原因 Top</p>
            {successStats.byErrorCode.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-400">暂无失败记录</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {successStats.byErrorCode.map((row) => (
                  <li
                    key={`${row.errorCode ?? 'unknown'}-${row.count}`}
                    className="flex justify-between items-center text-zinc-700"
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
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100">
            <CalendarRange className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">周留存矩阵</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              按注册周分组，统计各周内至少有一次生成的用户占比（最近 {retention.weeks} 周）
            </p>
          </div>
        </div>
        <SectionLoadError failed={retentionSection.failed} />
        <div className="overflow-x-auto">
          {retention.cohorts.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              暂无 cohort 数据。
            </div>
          ) : (
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="bg-zinc-50 text-zinc-700 text-xs uppercase font-medium">
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
              <tbody className="divide-y divide-zinc-100">
                {retention.cohorts.map((cohort) => (
                  <tr key={cohort.cohortWeek} className="hover:bg-zinc-50/40">
                    <td className="px-6 py-3 whitespace-nowrap font-medium text-zinc-900">
                      {cohort.cohortWeek}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-700">
                      {cohort.size}
                    </td>
                    {cohort.offsets.map((cell) => {
                      const rate = cell.rate;
                      const intensity =
                        rate == null ? 0 : Math.min(1, rate / 100);
                      const bg =
                        rate == null
                          ? 'transparent'
                          : `rgba(79, 70, 229, ${0.08 + intensity * 0.55})`;
                      const textColor =
                        intensity >= 0.6 ? 'text-white' : 'text-zinc-800';
                      return (
                        <td
                          key={cell.weekOffset}
                          className="px-3 py-3 text-center tabular-nums"
                        >
                          {rate == null ? (
                            <span className="text-zinc-300">—</span>
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
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">最近注册用户 (Top 50)</h2>
        </div>
        <SectionLoadError failed={usersSection.failed} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50 text-zinc-700 text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-4">用户</th>
                <th className="px-6 py-4">角色</th>
                <th className="px-6 py-4">注册时间</th>
                <th className="px-6 py-4">最后活跃</th>
                <th className="px-6 py-4">生成次数</th>
                <th className="px-6 py-4">VIP 到期</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-900">{user.name || '未命名'}</span>
                      <span className="text-xs text-zinc-500">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-zinc-100 text-zinc-800'}
                    `}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(user.lastLogin)}</td>
                  <td className="px-6 py-4 font-medium text-zinc-900">{user.generationCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.vipExpiresAt ? (
                      new Date(user.vipExpiresAt) > new Date() ? (
                        <span className="text-emerald-600 font-medium">{formatDate(user.vipExpiresAt)}</span>
                      ) : (
                        <span className="text-red-500">已过期</span>
                      )
                    ) : (
                      <span className="text-zinc-400">非 VIP</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
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
