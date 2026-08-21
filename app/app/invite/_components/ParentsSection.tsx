'use client';

import type { InvitationViewData } from './types';
import { useInViewAnimation } from './useInViewAnimation';
import styles from './ParentsSection.module.css';

export type ParentsSectionProps = Pick<
  InvitationViewData,
  'groomFatherName' | 'groomMotherName' | 'brideFatherName' | 'brideMotherName'
>;

/**
 * 혼주 성함 섹션 — 신랑측/신부측 아버지·어머니 성함을 좌우 2열로 나눠 보여준다.
 *
 * 전화/문자 연결(레퍼런스의 아이콘 버튼)은 폼에 연락처 입력 필드 자체가 없어 이번
 * 스코프에서 제외한다 — 성함 표시만 담당한다. 계좌 정보(harness-0i2.4)도 이 컴포넌트
 * 범위 밖: 계좌는 harness-8lh.4의 별도 API로 fetch할 예정이라 `InvitationViewData`에도
 * 섞지 않았다.
 */
export default function ParentsSection({
  groomFatherName,
  groomMotherName,
  brideFatherName,
  brideMotherName,
}: ParentsSectionProps) {
  const { ref, inView } = useInViewAnimation<HTMLElement>();

  return (
    <section
      ref={ref}
      className={`${styles.section} ${inView ? styles.inView : ''}`}
      aria-label="혼주 안내"
    >
      <div className={styles.columns}>
        <div className={styles.column}>
          <p className={styles.columnTitle}>신랑측 혼주</p>
          <dl className={styles.rows}>
            <div className={styles.row}>
              <dt className={styles.role}>아버지</dt>
              <dd className={styles.name}>{groomFatherName}</dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.role}>어머니</dt>
              <dd className={styles.name}>{groomMotherName}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.divider} aria-hidden="true" />

        <div className={styles.column}>
          <p className={styles.columnTitle}>신부측 혼주</p>
          <dl className={styles.rows}>
            <div className={styles.row}>
              <dt className={styles.role}>아버지</dt>
              <dd className={styles.name}>{brideFatherName}</dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.role}>어머니</dt>
              <dd className={styles.name}>{brideMotherName}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
