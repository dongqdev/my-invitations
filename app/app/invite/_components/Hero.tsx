import { formatWeddingDateTime } from './formatWeddingDateTime';
import type { InvitationViewData } from './types';
import styles from './Hero.module.css';

export type HeroProps = Pick<
  InvitationViewData,
  'mainImageUrl' | 'weddingDateTime' | 'groomName' | 'brideName'
>;

/**
 * 청첩장 최상단 히어로 섹션 — 대표 이미지, 예식 날짜/시간, 신랑·신부 성함.
 *
 * 폼(`app/create`)과 결합하지 않는다: props는 확정된 문자열 값만 받으므로, 이 컴포넌트는
 * harness-8lh.5(정적 페이지 생성)에서도 그대로 재사용할 수 있다.
 */
export default function Hero({ mainImageUrl, weddingDateTime, groomName, brideName }: HeroProps) {
  const formatted = formatWeddingDateTime(weddingDateTime);

  return (
    <section className={styles.hero} aria-label="청첩장 대표 정보">
      <div className={styles.imageFrame}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 대표 이미지는 로컬 blob
            미리보기 또는 나중에 확정될 원격 호스팅 URL을 그대로 받으므로 next/image의
            정적 도메인 최적화 대상이 아니다 (app/create/ImageUploads.tsx와 동일 컨벤션). */}
        <img
          src={mainImageUrl}
          alt={`신랑 ${groomName}, 신부 ${brideName}의 결혼식 대표 사진`}
          className={styles.image}
        />
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.details}>
        <div className={styles.dateBlock}>
          {formatted && (
            <time className={styles.dateTime} dateTime={formatted.isoDateTime}>
              <span className={styles.dateLine}>{formatted.dateLabel}</span>
              <span className={styles.timeLine}>{formatted.timeLabel}</span>
            </time>
          )}
        </div>

        <h1 className={styles.names}>
          <span className={styles.name}>{groomName}</span>
          <span className={styles.name}>{brideName}</span>
        </h1>
      </div>
    </section>
  );
}
