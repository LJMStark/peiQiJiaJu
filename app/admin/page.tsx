import { getDashboardStats, getUsersList } from '@/app/actions/admin';
import { Users, Activity, UserPlus, Image as ImageIcon } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { formatBeijingDateTime } from '@/lib/beijing-time';
import { isAdminRole } from './admin-shared';

export const dynamic = 'force-dynamic';

function formatDate(date: string | Date | null | undefined) {
  if (!date) return '-';
  return formatBeijingDateTime(date);
}

export default async function AdminDashboardPage() {
  const session = await getServerSession();

  if (!session || !isAdminRole(session.user.role)) {
    redirect('/');
  }

  const [stats, users] = await Promise.all([
    getDashboardStats(),
    getUsersList(),
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
