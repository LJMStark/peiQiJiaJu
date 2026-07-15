import type {Metadata} from 'next';
import { Inter, JetBrains_Mono, Noto_Serif_SC } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

// 落地页衬线展示字体；CJK 切片按 unicode-range 懒加载，只有用到 font-display 的页面才会下载
const notoSerifSc = Noto_Serif_SC({
  weight: ['600', '900'],
  subsets: ['latin'],
  variable: '--font-serif-sc',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: '佩奇家具｜配齐家具 · 商家图片工作台',
  description:
    '把自家家具配进客户的真实空间。上传图册、准备房间、生成可下载的 AI 效果图——家具商家的图片工作台。',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrainsMono.variable} ${notoSerifSc.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
