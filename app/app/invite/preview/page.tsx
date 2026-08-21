import Hero from '../_components/Hero';
import type { InvitationViewData } from '../_components/types';
import styles from './page.module.css';

/**
 * harness-0i2(뷰어 UI) 컴포넌트들을 실제로 렌더링해 눈으로 확인하는 임시 데모 라우트.
 *
 * 더미 데이터로 채운다 — 실데이터 연결(R2 업로드, 폼→뷰어 파이프라인, 정적 생성)은
 * 이 스토리의 범위 밖이다. harness-0i2의 다음 태스크들(혼주연락처 / Gallery / 계좌
 * 아코디언 / 하단바)은 이 라우트(`app/app/invite/preview/page.tsx`)에 자신의 섹션을
 * `<Hero .../>` 아래로 계속 이어 붙이면 된다 — 데모용 더미 데이터는 이 파일의
 * `DEMO_DATA`를 확장해서 공유한다.
 */
const DEMO_DATA: InvitationViewData = {
  mainImageUrl: '/demo/sample-main.svg',
  weddingDateTime: '2026-11-08T12:30',
  groomName: '김민준',
  brideName: '이서연',
};

export default function InvitePreviewPage() {
  return (
    <main className={styles.page}>
      <Hero
        mainImageUrl={DEMO_DATA.mainImageUrl}
        weddingDateTime={DEMO_DATA.weddingDateTime}
        groomName={DEMO_DATA.groomName}
        brideName={DEMO_DATA.brideName}
      />
    </main>
  );
}
