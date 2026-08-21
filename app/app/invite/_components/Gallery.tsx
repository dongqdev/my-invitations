'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { InvitationViewData } from './types';
import { useInViewAnimation } from './useInViewAnimation';
import styles from './Gallery.module.css';

export type GalleryProps = Pick<InvitationViewData, 'galleryImageUrls'>;

/**
 * 갤러리 섹션 — 업로드된 이미지를 3열 그리드 썸네일로 보여주고, 클릭 시 원본을
 * 확대해서 보여주는 라이트박스(모달)로 전환한다.
 *
 * 이미지가 0장이면(`galleryImageUrls.length === 0`) 섹션 자체를 렌더링하지 않는다 —
 * 폼에서 갤러리 이미지를 하나도 업로드하지 않은 경우가 실제로 있으므로(폼 쪽
 * `GalleryUpload`는 선택 사항), 빈 그리드 껍데기를 하객에게 보여주지 않기 위함.
 *
 * 썸네일과 라이트박스는 같은 URL을 그대로 재사용한다 — 이 스토리 범위에서는 썸네일용
 * 리사이즈 이미지를 별도로 만들지 않는다(원본 URL 하나만 받음).
 */
export default function Gallery({ galleryImageUrls }: GalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const thumbButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // 라이트박스가 열리기 직전에 포커스가 있던(=클릭한) 썸네일 인덱스. 닫힐 때
  // 그 썸네일로 포커스를 되돌리기 위해 openIndex가 null로 바뀌기 전 값을 들고 있는다.
  const lastOpenIndexRef = useRef<number | null>(null);
  const { ref: sectionRef, inView } = useInViewAnimation<HTMLElement>();

  useEffect(() => {
    if (openIndex === null) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setOpenIndex(null);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openIndex]);

  // aria-modal="true"는 포커스가 다이얼로그 안에 갇힌다는 약속이므로, 열릴 때
  // 닫기 버튼으로 포커스를 옮기고 닫힐 때 원래 클릭했던 썸네일로 되돌린다.
  useEffect(() => {
    if (openIndex !== null) {
      lastOpenIndexRef.current = openIndex;
      closeButtonRef.current?.focus();
    } else if (lastOpenIndexRef.current !== null) {
      thumbButtonRefs.current[lastOpenIndexRef.current]?.focus();
      lastOpenIndexRef.current = null;
    }
  }, [openIndex]);

  if (galleryImageUrls.length === 0) return null;

  function handleOverlayKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') setOpenIndex(null);
  }

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${inView ? styles.inView : ''}`}
      aria-label="갤러리"
    >
      <p className={styles.label}>갤러리</p>

      <div className={styles.grid}>
        {galleryImageUrls.map((url, index) => (
          <button
            key={url + index}
            type="button"
            ref={(element) => {
              thumbButtonRefs.current[index] = element;
            }}
            className={styles.thumbButton}
            onClick={() => setOpenIndex(index)}
            aria-label={`갤러리 사진 ${index + 1}번 확대 보기`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Hero와 동일 컨벤션:
                로컬 blob 미리보기 또는 원격 호스팅 URL을 그대로 받는다. */}
            <img src={url} alt="" className={styles.thumbImage} />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="갤러리 사진 확대 보기"
          tabIndex={-1}
          onClick={() => setOpenIndex(null)}
          onKeyDown={handleOverlayKeyDown}
        >
          <button
            type="button"
            ref={closeButtonRef}
            className={styles.closeButton}
            onClick={() => setOpenIndex(null)}
            aria-label="확대 보기 닫기"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element -- Hero와 동일 컨벤션 */}
          <img
            src={galleryImageUrls[openIndex]}
            alt=""
            className={styles.expandedImage}
            // 이미지 클릭이 오버레이의 닫기 동작으로 버블링되지 않게 막는다.
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
