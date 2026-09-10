import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'くもわの練習でやんす | 割合・百分率',
  description:
    '小学生向けの割合練習でやんす。言葉をくもわの円へ動かす練習と、増やす・減らす・そのままを選ぶ練習でやんす。テストは10問でやんす。',
  icons: { icon: `${process.env.PAGES_BASE_PATH || ''}/favicon.svg` },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
