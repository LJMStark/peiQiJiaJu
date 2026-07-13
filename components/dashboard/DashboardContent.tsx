'use client';

import { Loader2 } from 'lucide-react';
import { Catalog } from '@/components/Catalog';
import { RoomEditor } from '@/components/RoomEditor';
import { VipCenter } from '@/components/VipCenter';
import { Panel } from '@/components/ui/Panel';
import type { DashboardTab } from '@/lib/dashboard-navigation';
import type { FurnitureItem } from '@/lib/dashboard-types';

type DashboardContentProps = {
  activeTab: DashboardTab;
  catalog: FurnitureItem[];
  isCatalogLoading: boolean;
  isUploading: boolean;
  catalogError: string | null;
  deletingItemId: string | null;
  user: { id: string; role?: string; vipExpiresAt?: Date | null };
  onUploadFiles: (files: File[]) => Promise<FurnitureItem[]>;
  onDeleteFurniture: (id: string) => Promise<void>;
  onUpdateFurniture: (id: string, updates: Partial<FurnitureItem>) => Promise<void>;
};

export function DashboardContent({
  activeTab,
  catalog,
  isCatalogLoading,
  isUploading,
  catalogError,
  deletingItemId,
  user,
  onUploadFiles,
  onDeleteFurniture,
  onUpdateFurniture,
}: DashboardContentProps) {
  if (activeTab === 'catalog') {
    return (
      <Catalog
        catalog={catalog}
        onUploadFiles={onUploadFiles}
        onDelete={onDeleteFurniture}
        onUpdate={onUpdateFurniture}
        isUploading={isUploading}
        deletingItemId={deletingItemId}
        isLoading={isCatalogLoading}
        error={catalogError}
      />
    );
  }

  if (activeTab === 'vip') {
    return <VipCenter user={user} />;
  }

  if (isCatalogLoading) {
    return (
      <Panel className="flex min-h-48 items-center justify-center gap-3 text-sm text-zinc-600" aria-live="polite">
        <Loader2 aria-hidden="true" size={20} className="animate-spin text-indigo-600" />
        正在载入图册资源...
      </Panel>
    );
  }

  return <RoomEditor catalog={catalog} onUploadFiles={onUploadFiles} user={user} />;
}
