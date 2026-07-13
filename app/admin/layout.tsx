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
    <div className="flex min-h-screen flex-col bg-zinc-50 md:h-screen md:flex-row">
      <aside className="flex w-full flex-col gap-3 border-b border-zinc-200 bg-white p-4 md:w-64 md:gap-4 md:border-b-0 md:border-r md:p-6">
        <h2 className="text-xl font-bold text-zinc-800 tracking-tight">管理后台</h2>
        <nav className="flex flex-grow gap-2 overflow-x-auto md:mt-6 md:flex-col">
          <AdminNavLinks />
          {/* 其他管理菜单可在此扩展 */}
        </nav>
        <div className="mt-8 hidden border-t border-zinc-100 pt-6 md:block">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">开发与测试工具</h3>
          <div className="flex flex-col gap-2">
            <ResetGuideButton />
          </div>
        </div>
        <Link
          href="/"
          className="mt-auto hidden min-h-11 items-center text-sm text-zinc-500 transition-colors hover:text-zinc-900 md:flex"
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
