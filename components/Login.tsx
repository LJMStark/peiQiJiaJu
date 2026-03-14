'use client';

import Link from 'next/link';
import { ArrowRight, KeyRound, Sparkles, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { AuthShell } from '@/components/auth/AuthShell';

export function Login() {
  return (
    <AuthShell
      badge="第一步已切到真实账号体系"
      title="先登录，再进入 AI 家具工作台"
      description="我们已经把当前项目从前端假登录切换到了真实邮箱密码账号体系。后面的 Google 登录、支付和积分系统都会继续叠加在这一层上。"
      footer={
        <p className="text-zinc-500 text-sm">
          还没有账号？
          <Link href="/signup" className="ml-2 font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
            立即创建
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white">
              <KeyRound size={18} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-zinc-900">邮箱登录</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                已有账号可以直接登录，继续使用家具图册管理和 AI 室内编辑能力。
              </p>
              <Link
                href="/signin"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                前往登录
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <UserPlus size={18} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-zinc-900">注册账号</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                新用户先创建企业账号。接下来接 Google 登录、支付和积分时，都会直接复用这一套账号底座。
              </p>
              <Link
                href="/signup"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                去注册
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4 text-sm leading-6 text-zinc-500"
        >
          <div className="flex items-center gap-2 font-medium text-zinc-700">
            <Sparkles size={16} className="text-indigo-500" />
            下一步继续接 Google 登录和支付
          </div>
          <p className="mt-2">
            第一步的目标是把邮箱密码登录先跑通，让后面的商业化能力都能挂到同一套用户体系上。
          </p>
        </motion.div>
      </div>
    </AuthShell>
  );
}
