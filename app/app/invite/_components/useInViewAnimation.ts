'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 섹션 등장 애니메이션 공통 훅 — IntersectionObserver로 요소가 뷰포트에 처음
 * 들어오는 순간을 감지해 `inView`를 true로 바꾼다. 히어로를 제외한 5개 섹션
 * (초대문구/혼주/갤러리/계좌/하단바)이 이 훅 하나를 공유해서 fade+translateY
 * 등장 트랜지션을 켠다 — 각 컴포넌트가 옵저버를 따로 구현하지 않는다.
 *
 * 한 번 true가 되면 다시 false로 되돌리지 않는다(옵저버도 그 즉시 disconnect) —
 * 스크롤을 위아래로 오갈 때마다 반복 재생되면 "등장" 애니메이션이 아니라 산만한
 * 깜빡임이 된다.
 *
 * IntersectionObserver 생성 자체가 불가능한 환경(구형 브라우저, SSR 직후
 * hydration 이전 등)에서는 즉시 true를 반환해 콘텐츠가 영원히 숨겨진 채로
 * 남는 사고를 막는다. 이미 뷰포트 안에 있는 상태로 페이지가 로드되면(짧은
 * 페이지, 스크롤 복원 등) 옵저버의 최초 콜백이 그 즉시 `isIntersecting: true`로
 * 오므로 별도 분기 없이 즉시 보인다.
 *
 * `prefers-reduced-motion`은 이 훅이 아니라 각 컴포넌트의 CSS
 * (`@media (prefers-reduced-motion: reduce)`)가 담당한다 — 트랜지션 자체를
 * 무력화하고 항상 보이는 상태로 강제하므로, `inView`가 아직 false인 짧은 구간이
 * 있어도 reduced-motion 사용자에게는 애초에 화면에 드러나지 않는다.
 */
export function useInViewAnimation<T extends HTMLElement>(
  options: IntersectionObserverInit = { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      // effect 본문에서 setState를 동기 호출하면 즉시 재귀적으로 렌더가 겹치므로
      // (`react-hooks/set-state-in-effect`), 옵저버 콜백과 동일하게 마이크로태스크
      // 콜백 안에서 호출한다 — 동작은 다음 틱으로 한 프레임 미룰 뿐, 체감 지연은 없다.
      queueMicrotask(() => setInView(true));
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);

    observer.observe(node);
    return () => observer.disconnect();
    // options는 호출부에서 매번 새 객체 리터럴로 넘어올 수 있으므로 의도적으로
    // 최초 마운트 시점의 값만 써서 옵저버가 재생성되지 않게 한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, inView };
}
