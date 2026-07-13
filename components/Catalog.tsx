'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import { Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusNotice } from '@/components/ui/StatusNotice';
import { getFileInputSelection } from '@/lib/client/file-input';
import { FURNITURE_CATEGORIES, type FurnitureItem } from '@/lib/dashboard-types';
import { shouldBypassImageOptimization } from '@/lib/remote-images';

type CatalogProps = {
  catalog: FurnitureItem[];
  onUploadFiles: (files: File[]) => Promise<FurnitureItem[]>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<FurnitureItem>) => Promise<void>;
  isUploading: boolean;
  deletingItemId?: string | null;
  isLoading?: boolean;
  error?: string | null;
};

type UploadSummary = {
  successCount: number;
  failedFiles: File[];
};

export function Catalog({
  catalog,
  onUploadFiles,
  onDelete,
  onUpdate,
  isUploading,
  deletingItemId = null,
  isLoading = false,
  error = null,
}: CatalogProps) {
  const fileInputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const isDeleteDisabled = deletingItemId !== null;
  const uploadDisabled = isUploading || isBatchUploading;

  async function uploadFiles(files: File[]): Promise<void> {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    const failedFiles = files.filter((file) => !file.type.startsWith('image/'));
    let successCount = 0;
    setIsBatchUploading(true);
    setUploadSummary(null);

    try {
      for (const file of imageFiles) {
        try {
          const items = await onUploadFiles([file]);
          successCount += items.length;
          if (items.length === 0) {
            failedFiles.push(file);
          }
        } catch {
          failedFiles.push(file);
        }
      }
    } finally {
      setUploadSummary({ successCount, failedFiles });
      setIsBatchUploading(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const { input, files } = getFileInputSelection(event);
    try {
      if (files.length > 0) {
        await uploadFiles(files);
      }
    } finally {
      input.value = '';
    }
  }

  async function handleDrop(event: React.DragEvent): Promise<void> {
    event.preventDefault();
    setIsDragging(false);
    if (!uploadDisabled && event.dataTransfer.files.length > 0) {
      await uploadFiles(Array.from(event.dataTransfer.files));
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[28px]">家具图册</h1>
        <p className="mt-1 text-sm leading-6 text-zinc-600 sm:text-base">上传商家自己的家具图片，并为每件家具补上名称和分类。</p>
      </div>

      {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}
      {uploadSummary ? (
        <StatusNotice
          tone={uploadSummary.failedFiles.length > 0 ? 'warning' : 'success'}
          title={`成功上传 ${uploadSummary.successCount} 张，失败 ${uploadSummary.failedFiles.length} 张`}
          action={uploadSummary.failedFiles.length > 0 ? (
            <Button variant="secondary" size="compact" onClick={() => void uploadFiles(uploadSummary.failedFiles)}>
              重新上传失败项
            </Button>
          ) : undefined}
        >
          {uploadSummary.failedFiles.length > 0 ? '失败的图片仍保留在本次选择中，可以直接重试。' : '新家具已经加入下方图册。'}
        </StatusNotice>
      ) : null}

      <div
        className={`flex min-h-36 max-h-40 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-5 py-5 text-center transition-colors sm:flex-row sm:justify-between sm:text-left ${
          isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-zinc-300 bg-white hover:border-zinc-400'
        } ${uploadDisabled ? 'pointer-events-none opacity-60' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploadDisabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => void handleDrop(event)}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
            {uploadDisabled ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-indigo-600" /> : <Upload aria-hidden="true" size={20} />}
          </div>
          <div>
            <h2 className="font-semibold text-zinc-900">{uploadDisabled ? '正在上传和识别...' : '把家具图片拖到这里'}</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500 sm:text-sm">支持 PNG、JPG、WebP，可一次选择多张；建议使用透明或干净背景。</p>
          </div>
        </div>
        <input id={fileInputId} type="file" onChange={(event) => void handleFileChange(event)} className="sr-only" accept="image/*" multiple disabled={uploadDisabled} />
        <label
          htmlFor={fileInputId}
          aria-disabled={uploadDisabled}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          浏览文件
        </label>
      </div>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white text-sm text-zinc-600" aria-live="polite">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-indigo-600" />
          正在加载图册...
        </div>
      ) : catalog.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {catalog.map((item) => {
            const isDeletingItem = deletingItemId === item.id;

            return (
              <article key={item.id} className="group overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="relative aspect-square overflow-hidden bg-zinc-100">
                  <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-3" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" unoptimized={shouldBypassImageOptimization(item.imageUrl)} />
                  <button
                    type="button"
                    onClick={() => void onDelete(item.id)}
                    disabled={isDeleteDisabled}
                    aria-label={`删除${item.name}`}
                    className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg bg-white/95 text-red-600 shadow-sm opacity-100 transition-opacity hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  >
                    {isDeletingItem ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Trash2 aria-hidden="true" size={16} />}
                  </button>
                </div>
                <div className="space-y-2 border-t border-zinc-200 p-3">
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur();
                        if (event.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => {
                        if (editingName.trim() && editingName.trim() !== item.name) void onUpdate(item.id, { name: editingName.trim() });
                        setEditingId(null);
                      }}
                      autoFocus
                      aria-label={`修改${item.name}的名称`}
                      className="h-9 w-full rounded-lg border border-indigo-300 px-2 text-sm font-medium text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  ) : (
                    <button type="button" onClick={() => { setEditingId(item.id); setEditingName(item.name); }} className="block min-h-9 w-full truncate rounded-lg text-left text-sm font-medium text-zinc-900 hover:text-indigo-700" title={`${item.name}，点击修改名称`}>
                      {item.name}
                    </button>
                  )}
                  <label className="sr-only" htmlFor={`category-${item.id}`}>家具分类</label>
                  <select
                    id={`category-${item.id}`}
                    value={item.category || '其他'}
                    onChange={(event) => void onUpdate(item.id, { category: event.target.value })}
                    disabled={isDeleteDisabled}
                    className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs text-zinc-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {FURNITURE_CATEGORIES.filter((category) => category !== '全部').map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-12 text-center">
          <ImageIcon aria-hidden="true" className="mx-auto mb-3 text-zinc-300" size={32} />
          <p className="text-sm text-zinc-600">图册还是空的，先上传一组家具图片。</p>
        </div>
      )}
    </div>
  );
}
