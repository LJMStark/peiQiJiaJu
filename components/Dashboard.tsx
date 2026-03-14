'use client';

import { useEffect, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { LayoutGrid, Loader2, LogOut, Sofa, Sparkles, Crown, ShieldAlert } from 'lucide-react';
import { Catalog } from './Catalog';
import { RoomEditor } from './RoomEditor';
import { VipCenter } from './VipCenter';
import { fileToBase64 } from '@/lib/client/image-utils';
import { readJson, type CatalogResponse, type CatalogMutationResponse } from '@/lib/client/api';
import { FURNITURE_CATEGORIES, type FurnitureItem } from '@/lib/dashboard-types';
import { GEMINI_CLASSIFIER_MODEL } from '@/lib/gemini-config';

type DashboardProps = {
  companyName: string;
  user: {
    id: string;
    role?: string;
    vipExpiresAt?: Date | null;
  };
  onLogout: () => void;
};

export function Dashboard({ companyName, user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'editor' | 'vip'>('catalog');
  const [catalog, setCatalog] = useState<FurnitureItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const response = await fetch('/api/catalog', { cache: 'no-store' });
        const payload = await readJson<CatalogResponse>(response);
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
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          continue;
        }

        const base64Data = await fileToBase64(file);
        let category = '其他';

        try {
          const response = await ai.models.generateContent({
            model: GEMINI_CLASSIFIER_MODEL,
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type,
                },
              },
              {
                text: "You are a furniture classifier. Classify the given image into EXACTLY ONE of these categories: 沙发, 床, 书桌, 餐桌, 茶几, 椅子, 柜子, 灯具, 装饰, 其他. Return ONLY the category name, nothing else. If it's a sofa, return 沙发. If it's a bed, return 床. If it's a desk, return 书桌. If it's a dining table, return 餐桌. If it's a coffee table, return 茶几. If it's a chair, return 椅子. If it's a cabinet/storage, return 柜子. If it's lighting, return 灯具. If it's decoration, return 装饰. Otherwise return 其他.",
              },
            ],
          });

          const result = response.text?.trim();
          if (result && FURNITURE_CATEGORIES.some((value) => value === result)) {
            category = result;
          }
        } catch (error) {
          console.error('Classification failed', error);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
        formData.append('category', category);

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
    const response = await fetch(`/api/catalog/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: updates.name,
        category: updates.category,
      }),
    });
    const payload = await readJson<CatalogMutationResponse>(response);

    setCatalog((current) => current.map((item) => (item.id === id ? payload.item : item)));
  };

  const handleDeleteFurniture = async (id: string) => {
    const response = await fetch(`/api/catalog/${id}`, {
      method: 'DELETE',
    });

    await readJson<{ success: true }>(response);
    setCatalog((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 text-white rounded-lg flex items-center justify-center">
              <Sofa size={18} />
            </div>
            <span className="font-bold text-zinc-900 tracking-tight">{companyName}</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'catalog' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid size={16} />
              家具图册
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'editor' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Sparkles size={16} />
              室内编辑器
            </button>
            <button
              onClick={() => setActiveTab('vip')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'vip' ? 'bg-white text-zinc-900 shadow-sm' : 'text-amber-600 hover:text-amber-700'
              }`}
            >
              <Crown size={16} />
              会员中心
            </button>
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
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'catalog' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500'
          }`}
        >
          <LayoutGrid size={16} />
          家具图册
        </button>
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'editor' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500'
          }`}
        >
          <Sparkles size={16} />
          室内编辑器
        </button>
        <button
          onClick={() => setActiveTab('vip')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'vip' ? 'bg-amber-100 text-amber-900' : 'text-amber-600'
          }`}
        >
          <Crown size={16} />
          会员中心
        </button>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'catalog' ? (
          <Catalog
            catalog={catalog}
            onUploadFiles={handleUploadFiles}
            onDelete={handleDeleteFurniture}
            onUpdate={handleUpdateFurniture}
            isUploading={isUploading}
            isLoading={isCatalogLoading}
            error={catalogError}
          />
        ) : isCatalogLoading ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-10 flex items-center justify-center gap-3 text-zinc-500">
            <Loader2 size={20} className="animate-spin" />
            正在载入图册资源...
          </div>
        ) : activeTab === 'vip' ? (
          <VipCenter user={user} />
        ) : (
          <RoomEditor catalog={catalog} onUploadFiles={handleUploadFiles} />
        )}
      </main>
    </div>
  );
}
