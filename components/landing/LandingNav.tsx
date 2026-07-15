'use client';

import Link from 'next/link';
import { useScroll, useMotionValueEvent } from 'motion/react';
import { useState } from 'react';
import { BrandSeal } from '@/components/landing/BrandSeal';

const navLinks = [
  { href: '#workflow', label: '如何配齐' },
  { href: '#features', label: '能力' },
  { href: '#showcase', label: '效果' },
] as const;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (value) => {
    setScrolled(value > 12);
  });

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled
          ? 'border-linen bg-paper/95 backdrop-blur-sm'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex min-w-0 items-center gap-3">
          <BrandSeal />
          <span className="min-w-0">
            <span className="block truncate font-display text-base font-semibold tracking-tight text-ink sm:text-lg">
              佩奇家具
            </span>
            <span className="hidden font-mono text-[10px] tracking-[0.25em] text-umber sm:block">
              配齐 · 商家图片工作台
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="落地页导航">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-umber decoration-clay decoration-2 underline-offset-8 transition-colors hover:text-ink hover:underline"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/signin"
            className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-umber transition-colors hover:text-ink"
          >
            登录
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center bg-ink px-4 text-sm font-semibold text-paper transition-colors hover:bg-clay"
          >
            免费开始
          </Link>
        </div>
      </div>
    </header>
  );
}
