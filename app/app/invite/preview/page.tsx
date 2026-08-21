import Gallery from '../_components/Gallery';
import Hero from '../_components/Hero';
import InviteMessage from '../_components/InviteMessage';
import ParentsSection from '../_components/ParentsSection';
import type { InvitationViewData } from '../_components/types';
import DemoAccountSection from './DemoAccountSection';
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
  title: '저희 결혼합니다',
  // 줄바꿈 보존 확인용으로 일부러 여러 줄 + 빈 줄을 섞은 더미 문구.
  content:
    '하나님의 사랑 가운데 만난 두 사람이\n이제 평생의 동행이 되고자 합니다.\n\n소중한 날 함께해 주시면 큰 기쁨이 되겠습니다.',
  groomFatherName: '김철수',
  groomMotherName: '박영희',
  brideFatherName: '이정훈',
  brideMotherName: '최미경',
  galleryImageUrls: [
    '/demo/sample-gallery-1.svg',
    '/demo/sample-gallery-2.svg',
    '/demo/sample-gallery-3.svg',
    '/demo/sample-gallery-4.svg',
    '/demo/sample-gallery-5.svg',
    '/demo/sample-gallery-6.svg',
    '/demo/sample-gallery-1.svg',
  ],
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
      <InviteMessage title={DEMO_DATA.title} content={DEMO_DATA.content} />
      <ParentsSection
        groomFatherName={DEMO_DATA.groomFatherName}
        groomMotherName={DEMO_DATA.groomMotherName}
        brideFatherName={DEMO_DATA.brideFatherName}
        brideMotherName={DEMO_DATA.brideMotherName}
      />
      <Gallery galleryImageUrls={DEMO_DATA.galleryImageUrls} />
      <DemoAccountSection />
    </main>
  );
}
