'use client';

import { useState, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { FurnitureItem, FURNITURE_CATEGORIES } from './Dashboard';
import { motion } from 'motion/react';
import Image from 'next/image';

export function Catalog({ 
  catalog, 
  onUploadFiles, 
  onDelete,
  onUpdate,
  isUploading
}: { 
  catalog: FurnitureItem[], 
  onUploadFiles: (files: File[]) => Promise<FurnitureItem[]>,
  onDelete: (id: string) => void,
  onUpdate: (id: string, updates: Partial<FurnitureItem>) => void,
  isUploading: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onUploadFiles(Array.from(e.target.files));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-1">家具图册</h2>
        <p className="text-zinc-500">上传和管理您的家具，AI 将自动为您分类。</p>
      </div>

      {/* Upload Area */}
      <div 
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition-all cursor-pointer ${
          isDragging ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <div className="w-16 h-16 bg-white border border-zinc-100 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4">
          {isUploading ? (
            <Loader2 className="text-indigo-500 animate-spin" size={24} />
          ) : (
            <Upload className="text-zinc-400" size={24} />
          )}
        </div>
        <h3 className="text-lg font-medium text-zinc-900 mb-1">
          {isUploading ? '正在上传并识别分类...' : '上传家具图片'}
        </h3>
        <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
          将您的产品图片拖放到此处，或点击浏览。建议使用透明背景的 PNG 格式。
        </p>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*"
          multiple
          disabled={isUploading}
        />
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (!isUploading) fileInputRef.current?.click();
          }}
          disabled={isUploading}
          className="bg-white border border-zinc-200 text-zinc-900 font-medium py-2 px-6 rounded-xl hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
        >
          浏览文件
        </button>
      </div>

      {/* Catalog Grid */}
      {catalog.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {catalog.map((item) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={item.id} 
              className="group relative bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              <div className="aspect-square relative bg-zinc-100 flex items-center justify-center overflow-hidden">
                <Image 
                  src={`data:${item.mimeType};base64,${item.data}`} 
                  alt={item.name}
                  fill
                  className="object-contain p-4"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => onDelete(item.id)}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm text-red-500 rounded-lg flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm"
                  title="删除项目"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="p-3 border-t border-zinc-100 flex-1 flex flex-col justify-between gap-2">
                <p className="text-sm font-medium text-zinc-900 truncate" title={item.name}>{item.name}</p>
                <select
                  value={item.category || '其他'}
                  onChange={(e) => onUpdate(item.id, { category: e.target.value })}
                  className="text-xs border border-zinc-200 rounded-md px-2 py-1 bg-zinc-50 text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-900 w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  {FURNITURE_CATEGORIES.filter(c => c !== '全部').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          ))}
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
