'use client';

import { useEffect, useRef, useState } from 'react';
import { useInViewAnimation } from './useInViewAnimation';
import styles from './BottomBar.module.css';

/**
 * 화면 하단에 고정되는 바 — "링크 복사" 버튼 하나로 현재 페이지 URL을
 * `navigator.clipboard.writeText`로 복사하고, 복사 완료를 알리는 토스트를 보여준다.
 *
 * 일정 등록/카카오 공유는 이 태스크(harness-0i2.5.1)의 스코프 밖이라 아예 넣지
 * 않는다 — "준비 중" 비활성 버튼조차 지금 화면엔 없는 기능을 암시해 혼란을 줄 수
 * 있고, 링크 복사 하나만으로도 고정바로서 기능은 충분하다(과도한 UI 지양).
 *
 * 버튼 왼쪽에는 작은 명조체 서비스명("MY INVITATIONS")을 함께 둔다
 * (harness-4vc.4.4) — 버튼 하나만 덩그러니 있던 허전함을 완화하되, 실제 정보가
 * 아니라 장식적 워드마크이므로 `aria-hidden`으로 스크린리더 낭독 대상에서 뺀다.
 *
 * 시각 피드백은 `AccountSection`(harness-0i2.4.2)이 검증한 토스트 패턴 —
 * `data-visible` 불리언 + `aria-live="polite"` + opacity/translateY 트랜지션 +
 * setTimeout으로 일정 시간 후 자동 소멸 — 을 그대로 재사용한다(1.6s).
 */
export default function BottomBar() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `position: fixed`로 화면 하단에 고정되어 있어 다른 섹션과 달리 "스크롤해서
  // 뷰포트에 들어오는" 순간이 없다 — 다른 섹션의 기본 옵션(rootMargin: -10%)을
  // 그대로 쓰면 바 전체가 그 여백대 안에 갇혀 영원히 감지되지 않을 수 있으므로,
  // 여백 없이(threshold 0) 마운트 즉시 감지되게 한다.
  const { ref: barRef, inView } = useInViewAnimation<HTMLDivElement>({
    threshold: 0,
    rootMargin: '0px',
  });

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    };
  }, []);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // 클립보드 API가 없거나 권한이 없는 환경 — AccountSection과 동일하게 조용히 무시.
      return;
    }
    if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    setCopied(true);
    resetTimer.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div ref={barRef} className={`${styles.bar} ${inView ? styles.inView : ''}`}>
      <div className={styles.inner}>
        <span className={styles.brand} aria-hidden="true">
          MY INVITATIONS
        </span>
        <div className={styles.buttonWrap}>
          <span className={styles.toast} data-visible={copied} aria-live="polite">
            {copied ? '링크가 복사되었습니다' : ''}
          </span>
          <button type="button" className={styles.copyButton} onClick={() => void handleCopyLink()}>
            링크 복사
          </button>
        </div>
      </div>
    </div>
  );
}
