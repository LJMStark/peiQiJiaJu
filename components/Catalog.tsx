'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const isDeleteDisabled = deletingItemId !== null;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      await onUploadFiles(Array.from(event.target.files));
      event.currentTarget.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      await onUploadFiles(Array.from(event.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-1">家具图册</h2>
        <p className="text-zinc-500">上传和管理您的家具，AI 将自动为您分类并同步到 Supabase Storage。</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition-all cursor-pointer ${
          isDragging ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 bg-white border border-zinc-100 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4">
          {isUploading ? (
            <Loader2 className="text-indigo-500 animate-spin" size={24} />
          ) : (
            <Upload className="text-zinc-400" size={24} />
          )}
        </div>
        <h3 className="text-lg font-medium text-zinc-900 mb-1">
          {isUploading ? '正在上传、识别并同步...' : '上传家具图片'}
        </h3>
        <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
          将产品图片拖放到此处，或点击浏览。建议使用透明背景的 PNG 或干净背景的 JPG/WebP。
        </p>
        <input
          id={fileInputId}
          type="file"
          onChange={handleFileChange}
          className="sr-only"
          accept="image/*"
          multiple
          disabled={isUploading}
        />
        <label
          htmlFor={fileInputId}
          aria-disabled={isUploading}
          className="bg-white border border-zinc-200 text-zinc-900 font-medium py-2 px-6 rounded-xl hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
        >
          浏览文件
        </label>
      </div>

      {isLoading ? (
        <div className="text-center py-12 bg-white border border-zinc-200 rounded-2xl border-dashed">
          <Loader2 className="mx-auto text-zinc-300 mb-3 animate-spin" size={32} />
          <p className="text-zinc-500">正在加载您的图册...</p>
        </div>
      ) : catalog.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {catalog.map((item) => {
            const isDeletingItem = deletingItemId === item.id;

            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={item.id}
                className="group relative bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div className="aspect-square relative bg-zinc-100 flex items-center justify-center overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    unoptimized={shouldBypassImageOptimization(item.imageUrl)}
                  />
                  <button
                    onClick={() => void onDelete(item.id)}
                    disabled={isDeleteDisabled}
                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm text-red-500 rounded-lg flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm"
                    title="删除项目"
                  >
                    {isDeletingItem ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
                <div className="p-3 border-t border-zinc-100 flex-1 flex flex-col justify-between gap-2">
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      onBlur={() => {
                        if (editingId === item.id && editingName.trim() && editingName.trim() !== item.name) {
                          void onUpdate(item.id, { name: editingName.trim() });
                        }
                        setEditingId(null);
                      }}
                      autoFocus
                      className="text-sm font-medium text-zinc-900 w-full px-1 py-0.5 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p
                      className="text-sm font-medium text-zinc-900 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                      title={`${item.name} (点击编辑)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(item.id);
                        setEditingName(item.name);
                      }}
                    >
                      {item.name}
                    </p>
                  )}
                  <select
                    value={item.category || '其他'}
                    onChange={(event) => void onUpdate(item.id, { category: event.target.value })}
                    disabled={isDeleteDisabled}
                    className="text-xs border border-zinc-200 rounded-md px-2 py-1 bg-zinc-50 text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-900 w-full"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {FURNITURE_CATEGORIES.filter((category) => category !== '全部').map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-zinc-200 rounded-2xl border-dashed">
          <ImageIcon className="mx-auto text-zinc-300 mb-3" size={32} />
          <p className="text-zinc-500">您的图册是空的。</p>
        </div>
      )}
    </div>
  );
}
