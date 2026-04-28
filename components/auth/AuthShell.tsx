'use client';

import type { ReactNode } from 'react';
import { Sofa, Sparkles, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';

type AuthShellProps = {
  badge: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ badge, title, description, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-50 font-sans">
      <div className="flex-1 bg-zinc-950 text-white p-8 md:p-10 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-10 md:mb-12 lg:mb-16"
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
            <h1 className="text-[2.625rem] sm:text-5xl lg:text-6xl font-semibold leading-[1.1] tracking-tight mb-6 lg:mb-8">
              用佩奇家具，
              <br />
              <span className="text-zinc-400">配齐您的理想家。</span>
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed mb-8 lg:mb-12 max-w-md">
              让家具厂商上传图册，再让客户通过 AI 直观看到家具放进真实房间后的效果。
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-zinc-300">
              <div className="flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800 backdrop-blur-md">
                <Sparkles size={16} className="text-indigo-400" />
                <span>空间效果生成</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800 backdrop-blur-md">
                <Sofa size={16} className="text-emerald-400" />
                <span>家具图册管理</span>
              </div>
            </div>
          </motion.div>
        </div>

        
        {/* Contact QR Code - Hidden on Mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative z-10 hidden lg:flex items-center gap-4 mt-auto pt-16"
        >
          <div className="w-24 h-24 relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-1.5 shadow-xl flex-shrink-0">
            <Image
              src="/customer-service-qr.png"
              alt="客服微信二维码"
              fill
              className="object-contain p-1 rounded-lg"
              sizes="96px"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-zinc-300 font-medium mb-1">
              <MessageCircle size={16} />
              <h4>联系客服微信</h4>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-[200px]">
              扫码添加专属客服，获取使用指导与技术支持。
            </p>
          </div>
        </motion.div>

        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 pointer-events-none" />
      </div>

      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full"
        >
          <div className="mb-10">
            <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
              {badge}
            </div>
            <h2 className="mt-4 text-3xl font-bold text-zinc-900 mb-3">{title}</h2>
            <p className="text-zinc-500 leading-7">{description}</p>
          </div>

          {children}

          {footer ? <div className="mt-10 text-center">{footer}</div> : null}
        </motion.div>
      </div>
    </div>
  );
}
