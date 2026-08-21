import Link from 'next/link';
import { Nanum_Myeongjo, Noto_Sans_KR } from 'next/font/google';
import styles from './page.module.css';

// `/create`, `/invite` 레이아웃과 같은 패턴(명조 계열 display 폰트 + Noto Sans KR
// body 폰트를 CSS 변수로 스코프)을 그대로 따른다 — 첫 화면부터 나머지 앱과 같은
// 톤으로 보이도록.
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

export default function Home() {
  return (
    <div className={`${displayFont.variable} ${bodyFont.variable} ${styles.page}`}>
      <main className={styles.card}>
        <p className={styles.eyebrow}>MY INVITATIONS</p>
        <h1 className={styles.title}>
          모바일 청첩장을
          <br />
          손쉽게 만들어보세요
        </h1>
        <p className={styles.subtitle}>사진과 정보만 입력하면 나만의 청첩장이 완성됩니다.</p>
        <span className={styles.divider} aria-hidden="true" />
        <Link href="/create" className={styles.cta}>
          청첩장 만들기
        </Link>
      </main>
    </div>
  );
}
