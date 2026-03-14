'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Layers, Loader2, Maximize2, Upload, X } from 'lucide-react';
import { FURNITURE_CATEGORIES, type FurnitureItem } from '@/lib/dashboard-types';

type FurnitureDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  catalog: FurnitureItem[];
  selectedFurnitures: FurnitureItem[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  onToggleFurniture: (item: FurnitureItem) => void;
  onPreview: (item: FurnitureItem) => void;
  onUploadClick: () => void;
  isUploading: boolean;
};

export function FurnitureDrawer({
  isOpen,
  onClose,
  catalog,
  selectedFurnitures,
  activeCategory,
  onCategoryChange,
  onToggleFurniture,
  onPreview,
  onUploadClick,
  isUploading,
}: FurnitureDrawerProps) {
  const filteredCatalog = activeCategory === '全部'
    ? catalog
    : catalog.filter(item => item.category === activeCategory || (!item.category && activeCategory === '其他'));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <Layers size={20} className="text-indigo-600" />
                <h3 className="text-lg font-bold text-zinc-900">选择家具</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-zinc-100">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                {FURNITURE_CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => onCategoryChange(category)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      activeCategory === category
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => !isUploading && onUploadClick()}
                  disabled={isUploading}
                  className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
                    isUploading
                      ? 'border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed'
                      : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={20} className="mb-1 text-indigo-500 animate-spin" />
                      <span className="text-xs font-medium text-indigo-500">识别中...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={20} className="mb-1 text-zinc-400" />
                      <span className="text-xs font-medium">上传家具</span>
                    </>
                  )}
                </button>
                {filteredCatalog.map((item) => {
                  const isSelected = selectedFurnitures.some(f => f.id === item.id);
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'NEW', furnitureId: item.id }));
                      }}
                      onClick={() => onToggleFurniture(item)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                          : 'border-zinc-100 hover:border-zinc-300'
                      }`}
                    >
                      <Image src={item.imageUrl} alt={item.name} fill className="object-contain bg-zinc-50 p-2" unoptimized />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-0.5 z-10 shadow-sm">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(item);
                        }}
                        className="absolute bottom-2 right-2 bg-white/90 text-zinc-700 p-1.5 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-zinc-100 hover:text-zinc-900 shadow-sm z-10"
                        title="放大查看"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 bg-zinc-50">
              <button
                onClick={onClose}
                className="w-full py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                确认选择 ({selectedFurnitures.length} 件)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
