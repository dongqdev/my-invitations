import type { ChangeEvent } from 'react';
import type { GalleryImage } from './types';
import styles from './ImageUploads.module.css';

interface MainImageUploadProps {
  previewUrl: string | null;
  error?: string;
  onSelect: (file: File | null) => void;
}

export function MainImageUpload({ previewUrl, error, onSelect }: MainImageUploadProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    onSelect(file);
    // 같은 파일을 다시 골라도 change 이벤트가 뜨도록 값을 비운다.
    event.target.value = '';
  }

  return (
    <div className={styles.mainImageField}>
      <label
        htmlFor="mainImage"
        className={`${styles.mainImageDrop} ${previewUrl ? styles.hasPreview : ''}`}
        data-invalid={Boolean(error)}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 로컬 blob 미리보기, next/image 최적화 대상 아님
          <img src={previewUrl} alt="대표 이미지 미리보기" className={styles.mainImagePreview} />
        ) : (
          <span className={styles.mainImagePlaceholder}>
            <svg
              aria-hidden="true"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.5" />
              <path d="m3 16 5-4 4 3 4-5 5 6" />
            </svg>
            <span>대표 이미지를 올려주세요</span>
            <span className={styles.mainImageHint}>청첩장 상단에 크게 사용됩니다</span>
          </span>
        )}
        {previewUrl && <span className={styles.mainImageChangeBadge}>변경</span>}
        <input
          id="mainImage"
          name="mainImage"
          type="file"
          accept="image/*"
          onChange={handleChange}
          className={styles.visuallyHidden}
          aria-describedby={error ? 'mainImage-error' : undefined}
          aria-invalid={Boolean(error)}
        />
      </label>
      {error && (
        <p id="mainImage-error" className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface GalleryUploadProps {
  images: GalleryImage[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
}

export function GalleryUpload({ images, onAdd, onRemove }: GalleryUploadProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      onAdd(event.target.files);
    }
    event.target.value = '';
  }

  return (
    <div className={styles.galleryField}>
      <div className={styles.galleryGrid}>
        {images.map((image) => (
          <div key={image.id} className={styles.galleryThumb}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 blob 미리보기 */}
            <img src={image.previewUrl} alt="갤러리 이미지 미리보기" />
            <button
              type="button"
              className={styles.galleryRemoveButton}
              onClick={() => onRemove(image.id)}
              aria-label="이 갤러리 이미지 삭제"
            >
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        ))}
        <label htmlFor="galleryImages" className={styles.galleryAddTile}>
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>사진 추가</span>
          <input
            id="galleryImages"
            name="galleryImages"
            type="file"
            accept="image/*"
            multiple
            onChange={handleChange}
            className={styles.visuallyHidden}
          />
        </label>
      </div>
      <p className={styles.galleryHint}>
        {images.length > 0 ? `${images.length}장 선택됨` : '선택하지 않아도 괜찮아요'}
      </p>
    </div>
  );
}
