'use client';

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ContactQrCode } from './ContactQrCode';
import { WelcomeGuideModal } from './WelcomeGuideModal';
import { DashboardContent } from './dashboard/DashboardContent';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { DashboardNavigation, MobileDashboardNavigation } from './dashboard/DashboardNavigation';
import { readJson, requestJson, type CatalogResponse, type CatalogMutationResponse } from '@/lib/client/api';
import {
  DEFAULT_COMPANY_NAME,
  getCompanyNameValidationError,
  normalizeCompanyNameInput,
} from '@/lib/company-name';
import { startCatalogDelete } from '@/lib/catalog-state';
import { updateUser } from '@/lib/auth-client';
import { buildDashboardPath, resolveDashboardLocation, type DashboardTab } from '@/lib/dashboard-navigation';
import type { FurnitureItem } from '@/lib/dashboard-types';

type DashboardProps = {
  companyName: string;
  user: {
    id: string;
    role?: string;
    vipExpiresAt?: Date | null;
  };
  onLogout: () => void;
};

function getGuideStorageKey(userId: string): string {
  return `has_seen_onboarding_${userId}`;
}

function subscribeToGuideStorage() {
  return () => undefined;
}

function shouldShowStoredGuide(userId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return !window.localStorage.getItem(getGuideStorageKey(userId));
}

export function Dashboard({ companyName, user, onLogout }: DashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedLocation = resolveDashboardLocation(searchParams.get('tab'), searchParams.get('section'));
  const activeTab = requestedLocation.activeTab;
  const guideKey = getGuideStorageKey(user.id);
  const shouldShowWelcomeGuide = useSyncExternalStore(
    subscribeToGuideStorage,
    () => shouldShowStoredGuide(user.id),
    () => false
  );
  const [catalog, setCatalog] = useState<FurnitureItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [dismissedGuideKey, setDismissedGuideKey] = useState<string | null>(null);
  const [companyNameState, setCompanyNameState] = useState({
    source: companyName,
    display: companyName,
    draft: companyName,
  });
  const [isEditingCompanyName, setIsEditingCompanyName] = useState(false);
  const [companyNameError, setCompanyNameError] = useState('');
  const [pendingCatalogDeletionId, setPendingCatalogDeletionId] = useState<string | null>(null);
  const [isSavingCompanyName, startSavingCompanyName] = useTransition();
  const pendingCatalogDeletionIdRef = useRef<string | null>(null);
  if (companyNameState.source !== companyName) {
    setCompanyNameState({
      source: companyName,
      display: companyName,
      draft: companyName,
    });
  }
  const displayCompanyName = companyNameState.display;
  const companyNameDraft = companyNameState.draft;
  const showWelcomeGuide = shouldShowWelcomeGuide && dismissedGuideKey !== guideKey;

  useEffect(() => {
    if (requestedLocation.canonicalPath) {
      router.replace(requestedLocation.canonicalPath, { scroll: false });
    }
  }, [requestedLocation.canonicalPath, router]);

  const handleCloseWelcomeGuide = () => {
    localStorage.setItem(guideKey, 'true');
    setDismissedGuideKey(guideKey);
  };

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const payload = await requestJson<CatalogResponse>('/api/catalog', { cache: 'no-store' });
        setCatalog(payload.items);
        setCatalogError(null);
      } catch (error) {
        setCatalogError(error instanceof Error ? error.message : '图册加载失败，请刷新页面重试。');
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

      setCatalogError(error instanceof Error ? error.message : '家具删除失败，请稍后重试。');
    } finally {
      pendingCatalogDeletionIdRef.current = null;
      setPendingCatalogDeletionId(null);
    }
  };

  const handleStartEditingCompanyName = () => {
    setCompanyNameState((current) => ({
      ...current,
      draft: displayCompanyName,
    }));
    setCompanyNameError('');
    setIsEditingCompanyName(true);
  };

  const handleCancelEditingCompanyName = () => {
    setCompanyNameState((current) => ({
      ...current,
      draft: displayCompanyName,
    }));
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

      setCompanyNameState((current) => ({
        source: current.source,
        display: normalizedCompanyName,
        draft: normalizedCompanyName,
      }));
      setIsEditingCompanyName(false);
      router.refresh();
    });
  };

  const handleTabChange = (nextTab: DashboardTab) => {
    router.replace(buildDashboardPath(nextTab), { scroll: false });
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <DashboardHeader
        companyName={displayCompanyName}
        companyNameDraft={companyNameDraft}
        companyNameError={companyNameError}
        isEditing={isEditingCompanyName}
        isSaving={isSavingCompanyName}
        isAdmin={user.role === 'admin'}
        onDraftChange={(draft) => setCompanyNameState((current) => ({ ...current, draft }))}
        onStartEditing={handleStartEditingCompanyName}
        onCancelEditing={handleCancelEditingCompanyName}
        onSave={handleSaveCompanyName}
        onLogout={onLogout}
        navigation={<DashboardNavigation activeTab={activeTab} onTabChange={handleTabChange} />}
      />
      <MobileDashboardNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <DashboardContent
          activeTab={activeTab}
          catalog={catalog}
          isCatalogLoading={isCatalogLoading}
          isUploading={isUploading}
          catalogError={catalogError}
          deletingItemId={pendingCatalogDeletionId}
          user={user}
          onUploadFiles={handleUploadFiles}
          onDeleteFurniture={handleDeleteFurniture}
          onUpdateFurniture={handleUpdateFurniture}
        />
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
