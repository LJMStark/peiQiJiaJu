'use client';

import type { JSX } from 'react';
import { useState, useTransition } from 'react';
import { generateCodes } from '@/app/actions/admin';
import { RefreshCcw, Plus, CalendarDays, Hash, User, Clock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminCodesPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">兑换码管理</h1>
          <p className="text-gray-500 text-sm mt-1">生成和管理 VIP 兑换码</p>
        </div>
      </div>
      
      <CodesManager />
    </div>
  );
}

type GeneratedCode = {
  id: string;
  code: string;
  days: number;
  status: string;
  createdAt: Date;
};

function CodesManager(): JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [generateDays, setGenerateDays] = useState(30);
  const [error, setError] = useState('');
  const [justGenerated, setJustGenerated] = useState<GeneratedCode[]>([]);

  const handleGenerate = () => {
    setError('');
    startTransition(async () => {
      try {
        const codes = await generateCodes(generateCount, generateDays);
        setJustGenerated(codes as GeneratedCode[]);
        setIsModalOpen(false);
      } catch (err: any) {
        setError(err.message || '生成兑换码失败');
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          <Plus size={18} />
          <span>批量生成</span>
        </button>
      </div>

      {justGenerated.length > 0 && (
        <div className="mb-8 border border-green-200 bg-green-50 rounded-lg p-4">
          <h3 className="text-green-800 font-medium mb-2">成功生成了 {justGenerated.length} 个兑换码</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {justGenerated.map((code) => (
              <div key={code.id} className="bg-white px-3 py-2 rounded border border-green-100 font-mono text-sm shadow-sm flex justify-between items-center">
                <span className="text-gray-800">{code.code}</span>
                <span className="text-green-600 text-xs px-2 py-0.5 bg-green-100 rounded-full">{code.days}天</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-100 rounded-lg p-8 text-center">
         <p className="text-gray-500 mb-2">最新的生成记录显示在上方</p>
         <p className="text-sm text-gray-400">完整兑换码列表可由 API 返回，建议通过专用后台工具检索以保证性能。</p>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">生成测试兑换码</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">生成数量</label>
                <input 
                  type="number" 
                  min="1" max="100"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VIP 有效期（天）</label>
                <input 
                  type="number" 
                  min="1"
                  value={generateDays}
                  onChange={(e) => setGenerateDays(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="animate-spin" size={18} /> : <span>确认生成</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
