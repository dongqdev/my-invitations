import type { Metadata } from 'next';
import { Nanum_Myeongjo, Noto_Sans_KR } from 'next/font/google';
import styles from './layout.module.css';

const displayFont = Nanum_Myeongjo({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '700', '800'],
});

const bodyFont = Noto_Sans_KR({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: '청첩장 만들기',
  description: '모바일 청첩장에 담길 정보를 입력하세요.',
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${displayFont.variable} ${bodyFont.variable} ${styles.scope}`}>{children}</div>
  );
}
