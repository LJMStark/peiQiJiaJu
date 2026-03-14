'use client';

import Link from 'next/link';
import { ArrowRight, KeyRound, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { AuthShell } from '@/components/auth/AuthShell';

export function Login() {
  return (
    <AuthShell
      badge="欢迎来到佩奇家具"
      title="登录或注册，开始设计你的空间"
      description="创建账号后即可管理家具图册、上传房间照片，并用 AI 快速查看家具进入真实空间后的效果。"
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
                已有账号可以直接登录，继续查看和管理你的家具图册与空间效果。
              </p>
              <Link
                href="/signin"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                立即登录
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
                新用户几秒钟即可完成注册，开始上传家具、保存效果图，并持续管理你的项目。
              </p>
              <Link
                href="/signup"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                立即注册
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AuthShell>
  );
}
