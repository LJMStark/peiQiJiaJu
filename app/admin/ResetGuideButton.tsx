'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

export function ResetGuideButton() {
  const [resetting, setResetting] = useState(false);

  const handleReset = () => {
    setResetting(true);
    // 遍历并清除所有带有 has_seen_onboarding_ 前缀的 localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('has_seen_onboarding_')) {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setTimeout(() => {
        setResetting(false);
        // 跳转回首页以查看效果
        window.location.href = '/';
    }, 500);
  };

  return (
    <button
      onClick={handleReset}
      disabled={resetting}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
        ${resetting 
          ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
          : 'bg-zinc-900 text-white hover:bg-zinc-800'
        }
      `}
    >
      <RotateCcw size={16} className={resetting ? 'animate-spin' : ''} />
      {resetting ? '正在重置...' : '重置新用户引导 (测试用)'}
    </button>
  );
}
