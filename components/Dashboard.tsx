'use client';

import { useState } from 'react';
import { LogOut, LayoutGrid, Sparkles, Sofa } from 'lucide-react';
import { Catalog } from './Catalog';
import { RoomEditor } from './RoomEditor';
import { GoogleGenAI } from '@google/genai';

export const FURNITURE_CATEGORIES = ['全部', '沙发', '床', '书桌', '餐桌', '茶几', '椅子', '柜子', '灯具', '装饰', '其他'];

export interface FurnitureItem {
  id: string;
  name: string;
  data: string; // base64
  mimeType: string;
  category?: string;
}

export function Dashboard({ companyName, onLogout }: { companyName: string, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'editor'>('catalog');
  const [catalog, setCatalog] = useState<FurnitureItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleAddFurniture = (item: FurnitureItem) => {
    setCatalog(prev => [...prev, item]);
  };

  const handleUploadFiles = async (files: File[]): Promise<FurnitureItem[]> => {
    setIsUploading(true);
    const newItems: FurnitureItem[] = [];
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result.toString().split(',')[1]);
          } else {
            resolve('');
          }
        };
        reader.readAsDataURL(file);
      });

      if (base64Data) {
        let category = '其他';
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type
                }
              },
              {
                text: "You are a furniture classifier. Classify the given image into EXACTLY ONE of these categories: 沙发, 床, 书桌, 餐桌, 茶几, 椅子, 柜子, 灯具, 装饰, 其他. Return ONLY the category name, nothing else. If it's a sofa, return 沙发. If it's a bed, return 床. If it's a desk, return 书桌. If it's a dining table, return 餐桌. If it's a coffee table, return 茶几. If it's a chair, return 椅子. If it's a cabinet/storage, return 柜子. If it's lighting, return 灯具. If it's decoration, return 装饰. Otherwise return 其他."
              }
            ]
          });
          const result = response.text?.trim();
          if (result && FURNITURE_CATEGORIES.includes(result)) {
            category = result;
          }
        } catch (err) {
          console.error("Classification failed", err);
        }

        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name.replace(/\.[^/.]+$/, ""),
          data: base64Data,
          mimeType: file.type,
          category
        });
      }
    }
    
    if (newItems.length > 0) {
      setCatalog(prev => [...prev, ...newItems]);
    }
    setIsUploading(false);
    return newItems;
  };

  const handleUpdateFurniture = (id: string, updates: Partial<FurnitureItem>) => {
    setCatalog(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleDeleteFurniture = (id: string) => {
    setCatalog(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
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
          </nav>
          
          <button
            onClick={onLogout}
            className="text-zinc-500 hover:text-zinc-900 p-2 rounded-lg hover:bg-zinc-100 transition-colors"
            title="退出登录"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Nav */}
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
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'catalog' ? (
          <Catalog 
            catalog={catalog} 
            onUploadFiles={handleUploadFiles} 
            onDelete={handleDeleteFurniture} 
            onUpdate={handleUpdateFurniture}
            isUploading={isUploading}
          />
        ) : (
          <RoomEditor catalog={catalog} onUploadFiles={handleUploadFiles} />
        )}
      </main>
    </div>
  );
}
