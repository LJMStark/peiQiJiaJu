'use client';

import { useState, useEffect } from 'react';
import { KeyRound, ShieldAlert } from 'lucide-react';

export function ApiKeyGuard({ children }: { children: React.ReactNode }) {
  const [hasKey, setHasKey] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if (typeof window !== 'undefined' && window.aistudio && window.aistudio.hasSelectedApiKey) {
        try {
          const keySelected = await window.aistudio.hasSelectedApiKey();
          setHasKey(keySelected);
        } catch (e) {
          console.error(e);
        }
      } else {
        // If not in AI Studio environment, we might just bypass or show error.
        // For now, assume we are in AI Studio.
      }
      setIsChecking(false);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (typeof window !== 'undefined' && window.aistudio && window.aistudio.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        // Assume success to mitigate race condition
        setHasKey(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-zinc-300 border-t-zinc-900 rounded-full animate-spin"></div>
          <p className="mt-4 text-zinc-500 font-medium">正在检查环境...</p>
        </div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-zinc-100">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <KeyRound size={32} />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">需要 API 密钥</h1>
            <p className="text-zinc-600 mb-6 leading-relaxed">
              要使用高级图像生成功能 (nano banana pro)，您需要提供来自已启用计费的 Google Cloud 项目的 Gemini API 密钥。
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-left flex gap-3">
              <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">必须启用计费</p>
                <p>
                  请确保您的 Google Cloud 项目已启用计费。
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline ml-1 font-medium hover:text-amber-900">
                    了解更多
                  </a>
                </p>
              </div>
            </div>
            <button
              onClick={handleSelectKey}
              className="w-full bg-zinc-900 text-white font-medium py-3 px-4 rounded-xl hover:bg-zinc-800 transition-colors focus:ring-4 focus:ring-zinc-200"
            >
              选择 API 密钥
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
