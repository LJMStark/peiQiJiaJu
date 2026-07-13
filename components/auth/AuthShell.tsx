'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Sofa } from 'lucide-react';

type AuthShellProps = {
  badge: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ badge, title, description, children, footer }: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-zinc-100 lg:grid-cols-[44fr_56fr]">
      <section className="hidden lg:flex min-h-screen flex-col justify-between border-r border-zinc-200 bg-white p-8 xl:p-12" aria-label="产品示例">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <Sofa aria-hidden="true" size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-zinc-900">佩奇家具</p>
            <p className="text-xs text-zinc-500">家具商家的图片工作台</p>
          </div>
        </div>

        <div className="my-10">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/images/auth-room-before-after.png"
                alt="同一间客厅放入家具前后的合成示例"
                fill
                priority
                className="object-cover"
                sizes="44vw"
              />
              <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm">放入前</span>
              <span className="absolute right-3 top-3 rounded-lg bg-zinc-900/90 px-2.5 py-1 text-xs font-medium text-white shadow-sm">生成后</span>
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-900 xl:text-4xl">把自家家具放进客户的房间</h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600">上传家具图册，选择客户的室内图，几步生成可下载、可继续修改的空间效果图。</p>
        </div>

        <p className="text-xs text-zinc-500">示例图片为合成素材，不含客户房间或商品数据。</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Sofa aria-hidden="true" size={20} />
            </div>
            <div>
              <p className="font-semibold text-zinc-900">佩奇家具</p>
              <p className="text-xs text-zinc-500">家具商家的图片工作台</p>
            </div>
          </div>

          <div className="mb-8">
            <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{badge}</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900">{title}</h2>
            <p className="mt-2 leading-7 text-zinc-600">{description}</p>
          </div>

          {children}
          {footer ? <div className="mt-8 text-center">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}
