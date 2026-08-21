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
  title: '청첩장',
  description: '모바일 청첩장',
};

/**
 * `/invite` 아래 뷰어 라우트(및 데모 프리뷰) 전용 레이아웃.
 *
 * `app/create/layout.tsx`와 같은 패턴(명조 계열 display 폰트 + Noto Sans KR body
 * 폰트를 CSS 변수로 스코프)을 그대로 따른다 — 폼과 뷰어가 같은 타이포그래피 톤을
 * 공유하도록. 색 토큰(`--color-*`)은 `layout.module.css`에서 정의해 이 라우트 아래
 * 모든 뷰어 컴포넌트(Hero 및 이후 추가될 섹션들)가 재정의 없이 그대로 쓴다.
 */
export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${displayFont.variable} ${bodyFont.variable} ${styles.scope}`}>{children}</div>
  );
}
