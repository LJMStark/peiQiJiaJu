'use client';

import { Crown, LayoutGrid, Sparkles, type LucideIcon } from 'lucide-react';
import type { DashboardTab } from '@/lib/dashboard-navigation';

type DashboardNavigationProps = {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
};

type DashboardTabConfig = {
  value: DashboardTab;
  label: string;
  icon: LucideIcon;
};

const tabs: DashboardTabConfig[] = [
  { value: 'catalog', label: '家具图册', icon: LayoutGrid },
  { value: 'editor', label: '室内编辑器', icon: Sparkles },
  { value: 'vip', label: '会员中心', icon: Crown },
];

function TabButtons({
  activeTab,
  onTabChange,
  mobile,
}: DashboardNavigationProps & { mobile?: boolean }) {
  return tabs.map((tab) => {
    const Icon = tab.icon;
    const isActive = tab.value === activeTab;

    return (
      <button
        key={tab.value}
        type="button"
        onClick={() => onTabChange(tab.value)}
        aria-current={isActive ? 'page' : undefined}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
          isActive
            ? 'bg-white text-zinc-900 shadow-sm'
            : tab.value === 'vip'
              ? 'text-amber-700 hover:bg-white/70'
              : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-900'
        } ${mobile ? 'flex-1 px-3' : ''}`}
      >
        <Icon aria-hidden="true" size={16} />
        {tab.label}
      </button>
    );
  });
}

export function DashboardNavigation({ activeTab, onTabChange }: DashboardNavigationProps) {
  return (
    <nav aria-label="工作台主导航" className="hidden items-center gap-1 rounded-xl bg-zinc-100 p-1 md:flex">
      <TabButtons activeTab={activeTab} onTabChange={onTabChange} />
    </nav>
  );
}

export function MobileDashboardNavigation({ activeTab, onTabChange }: DashboardNavigationProps) {
  return (
    <nav
      aria-label="工作台主导航"
      className="sticky top-14 z-20 flex h-12 gap-1 overflow-x-auto border-b border-zinc-200 bg-zinc-100 px-2 py-0.5 md:hidden"
    >
      <TabButtons activeTab={activeTab} onTabChange={onTabChange} mobile />
    </nav>
  );
}
