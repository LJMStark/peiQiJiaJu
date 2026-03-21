'use client';

import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, Loader2, LogOut, Sofa, Sparkles, Crown, ShieldAlert, PencilLine, Check, X, UserPlus } from 'lucide-react';
import { Catalog } from './Catalog';
import { RoomEditor } from './RoomEditor';
import { VipCenter } from './VipCenter';
import { InviteCenter } from './InviteCenter';
import { ContactQrCode } from './ContactQrCode';
import { WelcomeGuideModal } from './WelcomeGuideModal';
import { readJson, requestJson, type CatalogResponse, type CatalogMutationResponse } from '@/lib/client/api';
import {
  DEFAULT_COMPANY_NAME,
  getCompanyNameValidationError,
  MAX_COMPANY_NAME_LENGTH,
  normalizeCompanyNameInput,
} from '@/lib/company-name';
import { startCatalogDelete } from '@/lib/catalog-state';
import { updateUser } from '@/lib/auth-client';
import type { FurnitureItem } from '@/lib/dashboard-types';
import { INVITE_DASHBOARD_TAB } from '@/lib/invitations';

type DashboardProps = {
  companyName: string;
  user: {
    id: string;
    role?: string;
    vipExpiresAt?: Date | null;
  };
  onLogout: () => void;
};

type DashboardTab = 'catalog' | 'editor' | 'vip' | typeof INVITE_DASHBOARD_TAB;
type DashboardTabVariant = 'desktop' | 'mobile';
type DashboardTabConfig = {
  value: DashboardTab;
  label: string;
  icon: LucideIcon;
  desktopActiveClassName: string;
  desktopInactiveClassName: string;
  mobileActiveClassName: string;
  mobileInactiveClassName: string;
};

const DASHBOARD_TABS: DashboardTabConfig[] = [
  {
    value: 'catalog',
    label: '家具图册',
    icon: LayoutGrid,
    desktopActiveClassName: 'bg-white text-zinc-900 shadow-sm',
    desktopInactiveClassName: 'text-zinc-500 hover:text-zinc-900',
    mobileActiveClassName: 'bg-zinc-100 text-zinc-900',
    mobileInactiveClassName: 'text-zinc-500',
  },
  {
    value: 'editor',
    label: '室内编辑器',
    icon: Sparkles,
    desktopActiveClassName: 'bg-white text-zinc-900 shadow-sm',
    desktopInactiveClassName: 'text-zinc-500 hover:text-zinc-900',
    mobileActiveClassName: 'bg-zinc-100 text-zinc-900',
    mobileInactiveClassName: 'text-zinc-500',
  },
  {
    value: INVITE_DASHBOARD_TAB,
    label: '邀请中心',
    icon: UserPlus,
    desktopActiveClassName: 'bg-white text-zinc-900 shadow-sm',
    desktopInactiveClassName: 'text-zinc-500 hover:text-zinc-900',
    mobileActiveClassName: 'bg-zinc-100 text-zinc-900',
    mobileInactiveClassName: 'text-zinc-500',
  },
  {
    value: 'vip',
    label: '会员中心',
    icon: Crown,
    desktopActiveClassName: 'bg-white text-zinc-900 shadow-sm',
    desktopInactiveClassName: 'text-amber-600 hover:text-amber-700',
    mobileActiveClassName: 'bg-amber-100 text-amber-900',
    mobileInactiveClassName: 'text-amber-600',
  },
];

function normalizeDashboardTab(tab: string | null): DashboardTab {
  if (tab === 'editor' || tab === 'vip' || tab === INVITE_DASHBOARD_TAB) {
    return tab;
  }

  return 'catalog';
}

function getGuideStorageKey(userId: string): string {
  return `has_seen_onboarding_${userId}`;
}

function getDashboardTabClassName(
  tab: DashboardTabConfig,
  activeTab: DashboardTab,
  variant: DashboardTabVariant
): string {
  const baseClassName =
    variant === 'desktop'
      ? 'px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2'
      : 'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap';
  const isActive = activeTab === tab.value;
  let stateClassName = tab.mobileInactiveClassName;

  if (variant === 'desktop') {
    stateClassName = isActive ? tab.desktopActiveClassName : tab.desktopInactiveClassName;
  } else {
    stateClassName = isActive ? tab.mobileActiveClassName : tab.mobileInactiveClassName;
  }

  return `${baseClassName} ${stateClassName}`;
}

export function Dashboard({ companyName, user, onLogout }: DashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = normalizeDashboardTab(searchParams.get('tab'));
  const [activeTab, setActiveTab] = useState<DashboardTab>(requestedTab);
  const [catalog, setCatalog] = useState<FurnitureItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const [displayCompanyName, setDisplayCompanyName] = useState(companyName);
  const [companyNameDraft, setCompanyNameDraft] = useState(companyName);
  const [isEditingCompanyName, setIsEditingCompanyName] = useState(false);
  const [companyNameError, setCompanyNameError] = useState('');
  const [pendingCatalogDeletionId, setPendingCatalogDeletionId] = useState<string | null>(null);
  const [isSavingCompanyName, startSavingCompanyName] = useTransition();
  const pendingCatalogDeletionIdRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    const guideKey = getGuideStorageKey(user.id);
    if (!localStorage.getItem(guideKey)) {
      setShowWelcomeGuide(true);
    }
  }, [user.id]);

  useEffect(() => {
    setDisplayCompanyName(companyName);
    setCompanyNameDraft(companyName);
  }, [companyName]);

  const handleCloseWelcomeGuide = () => {
    const guideKey = getGuideStorageKey(user.id);
    localStorage.setItem(guideKey, 'true');
    setShowWelcomeGuide(false);
  };

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const payload = await requestJson<CatalogResponse>('/api/catalog', { cache: 'no-store' });
        setCatalog(payload.items);
        setCatalogError(null);
      } catch (error) {
        setCatalogError(error instanceof Error ? error.message : 'Failed to load catalog.');
      } finally {
        setIsCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, []);

  const handleUploadFiles = async (files: File[]): Promise<FurnitureItem[]> => {
    setIsUploading(true);
    setCatalogError(null);
    const newItems: FurnitureItem[] = [];

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name.replace(/\.[^/.]+$/, ''));

        const response = await fetch('/api/catalog', {
          method: 'POST',
          body: formData,
        });
        const payload = await readJson<CatalogMutationResponse>(response);
        newItems.push(payload.item);
      }

      if (newItems.length > 0) {
        setCatalog((current) => [...newItems, ...current]);
      }

      return newItems;
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateFurniture = async (id: string, updates: Partial<FurnitureItem>) => {
    const payload = await requestJson<CatalogMutationResponse>(`/api/catalog/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: updates.name,
        category: updates.category,
      }),
    });

    setCatalog((current) => current.map((item) => (item.id === id ? payload.item : item)));
  };

  const handleDeleteFurniture = async (id: string) => {
    const deletion = startCatalogDelete(catalog, pendingCatalogDeletionIdRef.current, id);
    if (!deletion.didStart) {
      return;
    }

    const previousCatalog = [...catalog];
    pendingCatalogDeletionIdRef.current = deletion.deletingItemId;
    setPendingCatalogDeletionId(deletion.deletingItemId);
    setCatalogError(null);
    setCatalog(deletion.nextCatalog);

    try {
      await requestJson<{ success: true }>(`/api/catalog/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      try {
        const payload = await requestJson<CatalogResponse>('/api/catalog', { cache: 'no-store' });
        setCatalog(payload.items);
      } catch {
        setCatalog(previousCatalog);
      }

      setCatalogError(error instanceof Error ? error.message : 'Failed to delete furniture item.');
    } finally {
      pendingCatalogDeletionIdRef.current = null;
      setPendingCatalogDeletionId(null);
    }
  };

  const handleStartEditingCompanyName = () => {
    setCompanyNameDraft(displayCompanyName);
    setCompanyNameError('');
    setIsEditingCompanyName(true);
  };

  const handleCancelEditingCompanyName = () => {
    setCompanyNameDraft(displayCompanyName);
    setCompanyNameError('');
    setIsEditingCompanyName(false);
  };

  const handleSaveCompanyName = () => {
    const validationError = getCompanyNameValidationError(companyNameDraft);
    if (validationError) {
      setCompanyNameError(validationError);
      return;
    }

    const normalizedCompanyName = normalizeCompanyNameInput(companyNameDraft);

    if (normalizedCompanyName === displayCompanyName) {
      setCompanyNameError('');
      setIsEditingCompanyName(false);
      return;
    }

    setCompanyNameError('');
    startSavingCompanyName(async () => {
      const result = await updateUser({
        name: normalizedCompanyName,
      });

      if (result?.error) {
        setCompanyNameError(result.error.message || '公司名称修改失败，请稍后重试。');
        return;
      }

      setDisplayCompanyName(normalizedCompanyName);
      setCompanyNameDraft(normalizedCompanyName);
      setIsEditingCompanyName(false);
      router.refresh();
    });
  };

  const handleTabChange = (nextTab: DashboardTab) => {
    setActiveTab(nextTab);

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    if (nextTab === 'catalog') {
      nextSearchParams.delete('tab');
    } else {
      nextSearchParams.set('tab', nextTab);
    }

    const nextQuery = nextSearchParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-zinc-900 text-white rounded-lg flex items-center justify-center">
              <Sofa size={18} />
            </div>
            <div className="min-w-0">
              {isEditingCompanyName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={companyNameDraft}
                    onChange={(event) => setCompanyNameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleSaveCompanyName();
                      }

                      if (event.key === 'Escape') {
                        event.preventDefault();
                        handleCancelEditingCompanyName();
                      }
                    }}
                    maxLength={MAX_COMPANY_NAME_LENGTH}
                    className="w-56 max-w-[48vw] rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="请输入公司名称"
                    autoFocus
                    disabled={isSavingCompanyName}
                  />
                  <button
                    type="button"
                    onClick={handleSaveCompanyName}
                    disabled={isSavingCompanyName}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    title="保存公司名称"
                  >
                    {isSavingCompanyName ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingCompanyName}
                    disabled={isSavingCompanyName}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                    title="取消修改"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-zinc-900 tracking-tight">{displayCompanyName}</span>
                  <button
                    type="button"
                    onClick={handleStartEditingCompanyName}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <PencilLine size={14} />
                    修改
                  </button>
                </div>
              )}
              {companyNameError ? (
                <p className="mt-1 text-xs text-red-500">{companyNameError}</p>
              ) : null}
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            {DASHBOARD_TABS.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={getDashboardTabClassName(tab, activeTab, 'desktop')}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user.role === 'admin' && (
              <a
                href="/admin/codes"
                className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
              >
                <ShieldAlert size={16} />
                进入后台
              </a>
            )}
            <button
              onClick={onLogout}
              className="text-zinc-500 hover:text-zinc-900 p-2 rounded-lg hover:bg-zinc-100 transition-colors"
              title="退出登录"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="md:hidden bg-white border-b border-zinc-200 px-4 py-2 flex gap-2 overflow-x-auto">
        {DASHBOARD_TABS.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={getDashboardTabClassName(tab, activeTab, 'mobile')}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'catalog' ? (
          <Catalog
            catalog={catalog}
            onUploadFiles={handleUploadFiles}
            onDelete={handleDeleteFurniture}
            onUpdate={handleUpdateFurniture}
            isUploading={isUploading}
            deletingItemId={pendingCatalogDeletionId}
            isLoading={isCatalogLoading}
            error={catalogError}
          />
        ) : activeTab === INVITE_DASHBOARD_TAB ? (
          <InviteCenter />
        ) : activeTab === 'vip' ? (
          <VipCenter user={user} />
        ) : isCatalogLoading ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-10 flex items-center justify-center gap-3 text-zinc-500">
            <Loader2 size={20} className="animate-spin" />
            正在载入图册资源...
          </div>
        ) : (
          <RoomEditor catalog={catalog} onUploadFiles={handleUploadFiles} user={user} />
        )}
      </main>

      <ContactQrCode />
      
      <WelcomeGuideModal 
        isOpen={showWelcomeGuide} 
        onClose={handleCloseWelcomeGuide}
        userName={displayCompanyName !== DEFAULT_COMPANY_NAME ? displayCompanyName : undefined}
      />
    </div>
  );
}
