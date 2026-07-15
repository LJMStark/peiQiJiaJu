'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, FolderKanban, History, Sparkles } from 'lucide-react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { useRef } from 'react';
import { BeforeAfterCompare } from '@/components/landing/BeforeAfterCompare';
import { BrandSeal } from '@/components/landing/BrandSeal';
import { LandingNav } from '@/components/landing/LandingNav';
import { Reveal } from '@/components/landing/Reveal';
import { useClientReady } from '@/components/landing/use-client-ready';

const workflowSteps = [
  {
    index: 'STEP 01',
    numeral: '壹',
    title: '上传家具图册',
    description: '把在售单品、组合与材质图整理进图册，后续生成随时可调用。',
  },
  {
    index: 'STEP 02',
    numeral: '贰',
    title: '准备客户房间',
    description: '上传客户现场照片，选定要放入的家具，预览整体比例、风格与摆放效果。',
  },
  {
    index: 'STEP 03',
    numeral: '叁',
    title: '生成并下载效果',
    description: '几步得到可下载、可继续修改的空间效果图，服务门店沟通与成交。',
  },
] as const;

const features = [
  {
    title: '家具图册优先',
    description: '以真实商品图为素材库，而不是从空白 3D 场景重新建模。',
    icon: FolderKanban,
  },
  {
    title: '房间效果生成',
    description: '把家具「配进」客户房间，快速预览比例、风格与摆放效果。',
    icon: Sparkles,
  },
  {
    title: '历史可找回',
    description: '生成记录可回溯，方便销售复盘方案、二次修改与再次下载。',
    icon: History,
  },
] as const;

const stats = [
  { no: '01', value: '10', unit: '次', label: '新用户免费生成' },
  { no: '02', value: '3', unit: '步', label: '从图册到效果图' },
  { no: '03', value: '1', unit: '处', label: '商家图片工作台' },
] as const;

const showcasePoints = [
  { no: '01', text: '保留真实房间结构与光线' },
  { no: '02', text: '突出家具体量与风格是否合拍' },
  { no: '03', text: '生成结果可下载，继续沟通成交' },
] as const;

const HERO_FRAME_CLASS = 'border border-linen bg-white p-2 shadow-lg shadow-ink/5 sm:p-3';

export function LandingPage() {
  const ready = useClientReady();
  const reduceMotion = useReducedMotion();
  // Gate Motion entrance / parallax until after mount so SSR HTML matches first client paint.
  const canAnimate = ready && reduceMotion !== true;
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroImageY = useTransform(scrollYProgress, [0, 1], [0, canAnimate ? 64 : 0]);
  const heroImageScale = useTransform(scrollYProgress, [0, 1], [1, canAnimate ? 1.05 : 1]);

  const heroImage = (
    <div className="relative aspect-[4/3] w-full overflow-hidden">
      <Image
        src="/images/landing-room-styled.jpg"
        alt="配齐家具后的现代客厅效果示例"
        fill
        priority
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 48vw"
      />
    </div>
  );

  return (
    <div id="top" className="min-h-screen bg-paper text-ink">
      <div
        aria-hidden="true"
        className="texture-grain pointer-events-none fixed inset-0 z-50 opacity-5"
      />

      <LandingNav />

      <main>
        {/* Hero */}
        <section
          ref={heroRef}
          className="relative overflow-hidden border-b border-linen"
          aria-labelledby="landing-hero-title"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-12 -top-10 select-none font-display text-[18rem] font-black leading-none text-ink/5"
          >
            配
          </span>

          <div className="relative mx-auto grid max-w-7xl gap-16 px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-12 lg:items-center lg:gap-10 lg:px-8 lg:pb-28">
            <div className="lg:col-span-6">
              <Reveal>
                <p className="flex items-center gap-3 font-mono text-xs font-semibold tracking-[0.35em] text-clay">
                  <span className="h-px w-10 bg-clay" aria-hidden="true" />
                  家具商家的图片工作台
                </p>
              </Reveal>

              <Reveal delay={0.05}>
                <h1
                  id="landing-hero-title"
                  className="mt-8 font-display text-5xl font-black leading-[1.14] tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]"
                >
                  把自家家具，
                  <span className="block">配进客户的</span>
                  <span className="block text-clay">真实空间</span>
                </h1>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="mt-7 max-w-xl text-base leading-8 text-umber sm:text-lg">
                  佩奇家具帮门店与销售上传图册、准备房间、生成可下载效果图。
                  不卖空泛概念，只做「配齐」这一件事：让客户一眼看懂家具放进自己家的样子。
                </p>
              </Reveal>

              <Reveal delay={0.15}>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/signup"
                    className="group inline-flex min-h-12 items-center justify-center gap-3 bg-ink px-8 text-sm font-semibold tracking-wide text-paper transition-colors hover:bg-clay"
                  >
                    免费注册，先配 10 张
                    <ArrowRight
                      aria-hidden="true"
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                  <Link
                    href="/signin"
                    className="inline-flex min-h-12 items-center justify-center border border-ink/25 px-8 text-sm font-semibold tracking-wide text-ink transition-colors hover:border-ink hover:bg-cream"
                  >
                    已有账号，登录
                  </Link>
                </div>

                <p className="mt-8 font-mono text-xs leading-6 text-umber">
                  邮箱注册即可体验
                  <span className="mx-3 text-linen" aria-hidden="true">/</span>
                  效果图可下载保存
                  <span className="mx-3 text-linen" aria-hidden="true">/</span>
                  历史方案可回溯
                </p>
              </Reveal>
            </div>

            <div className="relative lg:col-span-6">
              <span
                aria-hidden="true"
                className="absolute -top-2 right-0 hidden select-none font-display text-sm font-semibold tracking-[0.5em] text-umber/70 [writing-mode:vertical-rl] xl:block"
              >
                眼见为实
              </span>

              <figure className="relative sm:pr-8">
                {canAnimate ? (
                  <motion.div
                    className={HERO_FRAME_CLASS}
                    style={{ y: heroImageY, scale: heroImageScale }}
                  >
                    {heroImage}
                  </motion.div>
                ) : (
                  <div className={HERO_FRAME_CLASS}>{heroImage}</div>
                )}

                <div className="absolute -bottom-10 -left-4 w-44 -rotate-2 border border-linen bg-white p-1.5 shadow-lg shadow-ink/10 sm:-left-8 sm:w-56 sm:p-2">
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <Image
                      src="/images/landing-furniture-catalog.jpg"
                      alt="家具单品图册一角"
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 176px, 224px"
                    />
                  </div>
                </div>

                <figcaption className="mt-16 flex items-baseline justify-between gap-4 border-t border-linen pt-3 pl-44 sm:pl-52">
                  <span className="font-mono text-[11px] tracking-[0.2em] text-clay">FIG. 01</span>
                  <span className="text-right text-xs leading-5 text-umber">
                    同一间客厅，配齐后 · 素材来自商家图册
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* 编辑部索引 / Stats */}
        <section className="border-b border-linen bg-cream/60" aria-label="产品要点">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-linen sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {stats.map((stat, index) => (
              <Reveal
                key={stat.label}
                delay={index * 0.06}
                className="flex items-start justify-between gap-4 px-6 py-9 sm:px-10"
              >
                <div>
                  <p className="flex items-baseline gap-2">
                    <span className="font-display text-6xl font-black tracking-tight text-ink">
                      {stat.value}
                    </span>
                    <span className="font-mono text-xs text-umber">{stat.unit}</span>
                  </p>
                  <p className="mt-3 text-sm text-umber">{stat.label}</p>
                </div>
                <span className="font-mono text-[11px] tracking-[0.2em] text-clay/60">
                  N°{stat.no}
                </span>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Workflow */}
        <section
          id="workflow"
          className="scroll-mt-24 border-b border-linen py-20 sm:py-28"
          aria-labelledby="workflow-title"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="flex flex-wrap items-baseline justify-between gap-4 border-t-2 border-ink pt-5">
                <p className="font-mono text-xs font-semibold tracking-[0.35em] text-clay">
                  SEC.01 — 工作流
                </p>
                <p className="hidden font-mono text-[11px] tracking-[0.2em] text-umber/70 sm:block">
                  从图册到效果图
                </p>
              </div>
              <h2
                id="workflow-title"
                className="mt-8 max-w-2xl font-display text-4xl font-black tracking-tight text-ink sm:text-5xl"
              >
                三步配齐，不绕弯路
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-umber">
                为家具商家、门店销售与运营设计：先有图册，再有房间，最后生成能拿去沟通的效果。
              </p>
            </Reveal>

            <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              {workflowSteps.map((step, index) => (
                <Reveal key={step.index} delay={index * 0.08}>
                  <article className="group relative h-full border-t border-ink/30 pt-7 transition-colors hover:border-clay">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-0 top-5 select-none font-display text-7xl font-black leading-none text-ink/5 transition-colors group-hover:text-clay/10"
                    >
                      {step.numeral}
                    </span>
                    <p className="font-mono text-xs font-semibold tracking-[0.35em] text-clay">
                      {step.index}
                    </p>
                    <h3 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-4 max-w-xs text-sm leading-7 text-umber">{step.description}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Features + catalog image */}
        <section
          id="features"
          className="scroll-mt-24 border-b border-linen bg-cream/40 py-20 sm:py-28"
          aria-labelledby="features-title"
        >
          <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-12 lg:items-start lg:gap-12 lg:px-8">
            <Reveal className="order-2 lg:order-1 lg:col-span-7" delay={0.05}>
              <figure>
                <div className="border border-linen bg-white p-2 shadow-lg shadow-ink/5 sm:p-3">
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <Image
                      src="/images/landing-furniture-catalog.jpg"
                      alt="家具单品图册示例：椅、边几、扶手椅与灯具"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 52vw"
                    />
                  </div>
                </div>
                <figcaption className="mt-3 flex items-baseline justify-between gap-4 border-t border-linen pt-3">
                  <span className="font-mono text-[11px] tracking-[0.2em] text-clay">FIG. 02</span>
                  <span className="text-xs leading-5 text-umber">
                    图册即素材库 · 上传一次，多房间反复配齐
                  </span>
                </figcaption>
              </figure>
            </Reveal>

            <div className="order-1 lg:order-2 lg:col-span-5">
              <Reveal>
                <div className="border-t-2 border-ink pt-5">
                  <p className="font-mono text-xs font-semibold tracking-[0.35em] text-clay">
                    SEC.02 — 能力
                  </p>
                </div>
                <h2
                  id="features-title"
                  className="mt-8 font-display text-4xl font-black tracking-tight text-ink sm:text-5xl"
                >
                  安静可靠的
                  <span className="block">图片生产台</span>
                </h2>
                <p className="mt-5 text-base leading-8 text-umber">
                  不做花哨装饰，把力气花在图册管理、房间准备、结果下载与历史找回——每天都能反复用的工具感。
                </p>
              </Reveal>

              <ul className="mt-10 border-t-2 border-ink/80">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <li key={feature.title}>
                      <Reveal delay={index * 0.07}>
                        <div className="flex gap-5 border-b border-linen py-6 transition-colors hover:bg-paper">
                          <Icon aria-hidden="true" size={18} className="mt-1 shrink-0 text-clay" />
                          <div>
                            <h3 className="font-display text-lg font-semibold text-ink">
                              {feature.title}
                            </h3>
                            <p className="mt-2 text-sm leading-7 text-umber">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </Reveal>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* Showcase before/after */}
        <section
          id="showcase"
          className="scroll-mt-24 border-b border-linen py-20 sm:py-28"
          aria-labelledby="showcase-title"
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:px-8">
            <Reveal className="lg:col-span-5">
              <div className="border-t-2 border-ink pt-5">
                <p className="font-mono text-xs font-semibold tracking-[0.35em] text-clay">
                  SEC.03 — 效果
                </p>
              </div>
              <h2
                id="showcase-title"
                className="mt-8 font-display text-4xl font-black tracking-tight text-ink sm:text-5xl"
              >
                拖一下，看清
                <span className="text-clay">「配齐」</span>前后
              </h2>
              <p className="mt-5 text-base leading-8 text-umber">
                空房间与配齐后的对比，是门店说服客户最直接的画面。左右拖动分割线，或使用下方滑块精细调整。
              </p>
              <div className="mt-10">
                {showcasePoints.map((point) => (
                  <p
                    key={point.no}
                    className="flex gap-4 border-b border-linen py-4 text-sm leading-7 text-umber first:border-t first:border-t-linen"
                  >
                    <span className="font-mono text-xs font-semibold leading-7 text-clay">
                      {point.no}
                    </span>
                    {point.text}
                  </p>
                ))}
              </div>
            </Reveal>

            <Reveal className="lg:col-span-7" delay={0.08}>
              <BeforeAfterCompare
                beforeSrc="/images/auth-room-before-after.png"
                afterSrc="/images/auth-room-before-after.png"
                beforeAlt="空房间示例"
                afterAlt="配齐家具后的房间示例"
                splitComposite
              />
              <p className="mt-4 font-mono text-[11px] leading-5 text-umber/80">
                * 示例图片为展示素材，不含真实客户房间或商品数据。
              </p>
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <section
          className="relative overflow-hidden bg-ink py-20 text-paper sm:py-28"
          aria-labelledby="cta-title"
        >
          <div
            aria-hidden="true"
            className="texture-grain pointer-events-none absolute inset-0 opacity-10 invert"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-20 select-none font-display text-[16rem] font-black leading-none text-paper/5"
          >
            齐
          </span>

          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:items-end lg:px-8">
            <div className="lg:col-span-8">
              <Reveal>
                <p className="flex items-center gap-3 font-mono text-xs font-semibold tracking-[0.35em] text-clay-light">
                  <span className="h-px w-10 bg-clay-light" aria-hidden="true" />
                  现在开始
                </p>
                <h2
                  id="cta-title"
                  className="mt-8 font-display text-4xl font-black tracking-tight sm:text-6xl"
                >
                  开始配齐
                  <span className="mt-2 block">你的第一间房</span>
                </h2>
                <p className="mt-6 max-w-xl text-base leading-8 text-paper/70">
                  注册即可免费生成 10 张效果图。登录后进入工作台：图册、室内编辑、会员中心一站完成。
                </p>
              </Reveal>
            </div>

            <Reveal className="lg:col-span-4" delay={0.08}>
              <div className="flex flex-col gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex min-h-14 items-center justify-between gap-3 bg-clay px-7 text-sm font-semibold tracking-wide text-paper transition-colors hover:bg-clay-deep"
                >
                  立即免费注册
                  <ArrowRight
                    aria-hidden="true"
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  href="/signin"
                  className="inline-flex min-h-14 items-center justify-between gap-3 border border-paper/25 px-7 text-sm font-semibold tracking-wide text-paper transition-colors hover:border-paper hover:bg-paper/10"
                >
                  返回登录
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="bg-paper">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <BrandSeal />
            <div>
              <p className="font-display text-lg font-semibold text-ink">佩奇家具</p>
              <p className="mt-1 font-mono text-[11px] tracking-[0.2em] text-umber">
                配齐家具 · 商家图片工作台
              </p>
            </div>
          </div>
          <nav
            aria-label="页脚导航"
            className="flex flex-wrap items-center gap-6 text-sm text-umber"
          >
            <Link href="/signin" className="transition-colors hover:text-clay">
              登录
            </Link>
            <Link href="/signup" className="transition-colors hover:text-clay">
              注册
            </Link>
            <a href="#workflow" className="transition-colors hover:text-clay">
              如何配齐
            </a>
          </nav>
          <p className="font-mono text-xs text-umber/70">
            © {new Date().getFullYear()} 佩奇家具 PEIQI
          </p>
        </div>
      </footer>
    </div>
  );
}
