'use client';

import type { JSX } from 'react';
import { useId, useState, useTransition } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { postJson } from '@/lib/client/api';
import { formatRedemptionCode } from '@/lib/redemption-codes';
import { useDialogAccessibility } from '@/components/use-dialog-accessibility';

export default function AdminCodesPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">兑换码管理</h1>
          <p className="text-zinc-500 text-sm mt-1">生成和管理 VIP 兑换码</p>
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
  const modalTitleId = useId();
  const countInputId = useId();
  const daysInputId = useId();
  const closeGenerateModal = () => {
    if (!isPending) {
      setIsModalOpen(false);
    }
  };
  const dialogRef = useDialogAccessibility<HTMLDivElement>({
    isOpen: isModalOpen,
    onClose: closeGenerateModal,
    isDismissDisabled: isPending,
    lockScroll: true,
  });

  const handleGenerate = () => {
    setError('');
    startTransition(async () => {
      try {
        const payload = await postJson<{ codes: GeneratedCode[] }>('/api/admin/codes/generate', {
          count: generateCount,
          days: generateDays,
        });
        setJustGenerated(payload.codes);
        setIsModalOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : '生成兑换码失败');
      }
    });
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6">
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-800"
        >
          <Plus size={18} />
          <span>批量生成</span>
        </button>
      </div>

      {justGenerated.length > 0 && (
        <div className="mb-8 border border-emerald-200 bg-emerald-50 rounded-lg p-4">
          <h3 className="text-emerald-800 font-medium mb-2">成功生成了 {justGenerated.length} 个兑换码</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {justGenerated.map((code) => (
              <div key={code.id} className="bg-white px-3 py-2 rounded border border-emerald-100 font-mono text-sm shadow-sm flex justify-between items-center">
                <span className="text-zinc-800">{formatRedemptionCode(code.code)}</span>
                <span className="text-emerald-600 text-xs px-2 py-0.5 bg-emerald-100 rounded-full">{code.days}天</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-8 text-center">
         <p className="text-zinc-500 mb-2">最新的生成记录显示在上方</p>
         <p className="text-sm text-zinc-400">完整兑换码列表可由 API 返回，建议通过专用后台工具检索以保证性能。</p>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={closeGenerateModal}
        >
          <div
            ref={dialogRef}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            tabIndex={-1}
          >
            <h3 id={modalTitleId} className="text-lg font-bold text-zinc-900 mb-4">生成测试兑换码</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor={countInputId} className="block text-sm font-medium text-zinc-700 mb-1">生成数量</label>
                <input 
                  id={countInputId}
                  type="number" 
                  min="1" max="100"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(Number(e.target.value))}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor={daysInputId} className="block text-sm font-medium text-zinc-700 mb-1">VIP 有效期（天）</label>
                <input 
                  id={daysInputId}
                  type="number" 
                  min="1"
                  value={generateDays}
                  onChange={(e) => setGenerateDays(Number(e.target.value))}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              
              {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeGenerateModal}
                  disabled={isPending}
                  className="min-h-11 rounded-lg px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="flex min-h-11 items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
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
