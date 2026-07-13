'use client';

import { Check, Loader2, LogOut, PencilLine, ShieldAlert, Sofa, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MAX_COMPANY_NAME_LENGTH } from '@/lib/company-name';
import type { ReactNode } from 'react';

type DashboardHeaderProps = {
  companyName: string;
  companyNameDraft: string;
  companyNameError: string;
  isEditing: boolean;
  isSaving: boolean;
  isAdmin: boolean;
  onDraftChange: (value: string) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: () => void;
  onLogout: () => void;
  navigation: ReactNode;
};

export function DashboardHeader({
  companyName,
  companyNameDraft,
  companyNameError,
  isEditing,
  isSaving,
  isAdmin,
  onDraftChange,
  onStartEditing,
  onCancelEditing,
  onSave,
  onLogout,
  navigation,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Sofa aria-hidden="true" size={18} />
          </div>
          <div className="min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <label className="sr-only" htmlFor="dashboard-company-name">公司名称</label>
                <input
                  id="dashboard-company-name"
                  type="text"
                  value={companyNameDraft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onSave();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      onCancelEditing();
                    }
                  }}
                  maxLength={MAX_COMPANY_NAME_LENGTH}
                  className="h-11 w-48 max-w-[45vw] rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="请输入公司名称"
                  autoFocus
                  disabled={isSaving}
                  aria-describedby={companyNameError ? 'dashboard-company-name-error' : undefined}
                />
                <Button size="icon" onClick={onSave} disabled={isSaving} ariaLabel="保存公司名称">
                  {isSaving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Check aria-hidden="true" size={16} />}
                </Button>
                <Button size="icon" variant="secondary" onClick={onCancelEditing} disabled={isSaving} ariaLabel="取消修改">
                  <X aria-hidden="true" size={16} />
                </Button>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                <span className="truncate font-semibold tracking-tight text-zinc-900">{companyName}</span>
                <Button variant="ghost" size="compact" onClick={onStartEditing} className="shrink-0 px-2">
                  <PencilLine aria-hidden="true" size={14} />
                  <span className="hidden sm:inline">修改</span>
                </Button>
              </div>
            )}
            {companyNameError ? (
              <p id="dashboard-company-name-error" role="alert" className="mt-1 text-xs text-red-600">{companyNameError}</p>
            ) : null}
          </div>
        </div>

        {navigation}

        <div className="flex items-center gap-1 sm:gap-2">
          {isAdmin ? (
            <a
              href="/admin/codes"
              aria-label="进入后台"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ShieldAlert aria-hidden="true" size={18} />
              <span className="hidden sm:inline">进入后台</span>
            </a>
          ) : null}
          <Button variant="ghost" size="icon" onClick={onLogout} ariaLabel="退出登录">
            <LogOut aria-hidden="true" size={20} />
          </Button>
        </div>
      </div>
    </header>
  );
}
