'use client';

import { useState } from 'react';
import { Sofa, ArrowRight, Mail, Lock, Building2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Login({ onLogin }: { onLogin: (name: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      if (isLogin) {
        // For login, just use the email prefix as a fallback if we don't have a real backend
        const name = email.split('@')[0];
        onLogin(name || 'User');
      } else {
        onLogin(companyName.trim() || 'User');
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50 font-sans">
      {/* Left Panel - Branding & Visuals */}
      <div className="flex-1 bg-zinc-950 text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-16"
          >
            <div className="w-12 h-12 bg-white text-zinc-950 rounded-2xl flex items-center justify-center shadow-xl shadow-white/10">
              <Sofa size={24} strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-bold tracking-tight">佩奇家具</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-xl"
          >
            <h1 className="text-5xl md:text-6xl font-semibold leading-[1.1] tracking-tight mb-8">
              用佩奇家具，<br/>
              <span className="text-zinc-400">配齐您的理想家。</span>
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed mb-12 max-w-md">
              上传您的图册，让客户使用先进的 AI 技术，直观地看到佩奇家具在他们自己家中的完美效果。
            </p>
            
            <div className="flex items-center gap-4 text-sm font-medium text-zinc-300">
              <div className="flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800 backdrop-blur-md">
                <Sparkles size={16} className="text-indigo-400" />
                <span>AI 智能合成</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800 backdrop-blur-md">
                <Sofa size={16} className="text-emerald-400" />
                <span>海量图册管理</span>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 pointer-events-none"></div>
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full"
        >
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-zinc-900 mb-3">
              {isLogin ? '欢迎回来' : '创建账号'}
            </h2>
            <p className="text-zinc-500">
              {isLogin ? '输入您的邮箱和密码以进入工作台。' : '注册新账号，开启您的 AI 家具展示之旅。'}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <label htmlFor="companyName" className="block text-sm font-medium text-zinc-700 mb-2">
                    公司名称
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Building2 size={18} className="text-zinc-400" />
                    </div>
                    <input
                      id="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="例如：某某家具有限公司"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all bg-white"
                      required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
                邮箱地址
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-zinc-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                  密码
                </label>
                {isLogin && (
                  <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    忘记密码？
                  </a>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-zinc-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all bg-white"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-zinc-900 text-white font-medium py-3.5 px-4 rounded-xl hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-lg shadow-zinc-900/20"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? '登录' : '注册账号'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-zinc-500 text-sm">
              {isLogin ? '还没有账号？' : '已有账号？'}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                {isLogin ? '立即注册' : '返回登录'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
