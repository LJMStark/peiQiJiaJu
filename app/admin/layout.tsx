import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import Link from 'next/link';
import { ResetGuideButton } from './ResetGuideButton';
import { AdminNavLinks } from './AdminNavLinks';
import { isAdminRole } from './admin-shared';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  // 只能由管理员访问
  if (!session || !isAdminRole(session.user.role)) {
    redirect('/');
  }

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-6 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">管理后台</h2>
        <nav className="flex flex-col gap-2 flex-grow mt-6">
          <AdminNavLinks />
          {/* 其他管理菜单可在此扩展 */}
        </nav>
        <div className="mt-8 border-t border-gray-100 pt-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">开发与测试工具</h3>
          <div className="flex flex-col gap-2">
            <ResetGuideButton />
          </div>
        </div>
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors mt-auto"
        >
          返回前台
        </Link>
      </aside>
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
