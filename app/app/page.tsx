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
      {/* 실제 청첩장 뷰어(app/invite/_components/Hero.tsx)의 이미지+구분선+이름 구조를
          장식용으로 축소 재현한 목업. 실 데이터가 필요한 Hero를 그대로 끌어오지 않고,
          완성물이 어떤 느낌인지만 예시로 보여준다 — 예시 이름/날짜는 실제 값이 아니므로
          스크린리더에는 노출하지 않는다(아래 텍스트 카드가 같은 의미를 이미 전달). */}
      <div className={styles.preview} aria-hidden="true">
        <div className={styles.previewCard}>
          <div className={styles.previewImageFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 데모용 정적 SVG,
                app/invite/_components/Hero.tsx와 동일 컨벤션 */}
            <img src="/demo/sample-main.svg" alt="" className={styles.previewImage} />
          </div>
          <div className={styles.previewInfo}>
            <span className={styles.previewNames}>건우 · 서연</span>
            <span className={styles.previewDivider} />
            <span className={styles.previewDate}>2026. 11. 14 SAT</span>
          </div>
        </div>
      </div>

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
