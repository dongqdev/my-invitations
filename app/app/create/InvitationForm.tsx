'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  createEmptyInvitationFormData,
  PARENT_LABELS,
  type InvitationFormData,
  type ParentInfo,
  type ParentKey,
} from './types';
import { isReadyToSubmit, toSummaryMessages, validateInvitationForm } from './validation';
import { GalleryUpload, MainImageUpload } from './ImageUploads';
import ParentAccountFields from './ParentAccountFields';
import styles from './InvitationForm.module.css';

const REQUIRED_FIELD_COUNT = 6;

function countCompletedRequiredFields(data: InvitationFormData): number {
  let count = 0;
  if (data.mainImage) count += 1;
  if (data.title.trim()) count += 1;
  if (data.content.trim()) count += 1;
  if (data.weddingDateTime) count += 1;
  if (data.groomName.trim()) count += 1;
  if (data.brideName.trim()) count += 1;
  return count;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {description && <p className={styles.sectionDescription}>{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function InvitationForm() {
  const [formData, setFormData] = useState<InvitationFormData>(createEmptyInvitationFormData);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const formDataRef = useRef(formData);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // 언마운트 시 생성해 둔 blob 미리보기 URL을 정리한다.
  useEffect(() => {
    return () => {
      const current = formDataRef.current;
      if (current.mainImagePreviewUrl) URL.revokeObjectURL(current.mainImagePreviewUrl);
      current.galleryImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  const errors = validateInvitationForm(formData);
  const readyToSubmit = isReadyToSubmit(formData);
  const completedCount = countCompletedRequiredFields(formData);
  const showFieldErrors = submitAttempted;
  const summaryMessages = showFieldErrors ? toSummaryMessages(errors) : [];
  const hasVisibleErrors = summaryMessages.length > 0;
  const submitSucceeded = submitAttempted && !hasVisibleErrors;

  useEffect(() => {
    if (submitCount > 0 && summaryRef.current) {
      summaryRef.current.focus();
    }
    // submitCount가 바뀔 때만(=제출 버튼을 눌렀을 때만) 포커스를 옮긴다.
  }, [submitCount]);

  function handleMainImageSelect(file: File | null) {
    setFormData((prev) => {
      if (prev.mainImagePreviewUrl) URL.revokeObjectURL(prev.mainImagePreviewUrl);
      if (!file) {
        return { ...prev, mainImage: null, mainImagePreviewUrl: null };
      }
      return { ...prev, mainImage: file, mainImagePreviewUrl: URL.createObjectURL(file) };
    });
  }

  function handleGalleryAdd(files: FileList) {
    setFormData((prev) => {
      const additions = Array.from(files).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return { ...prev, galleryImages: [...prev.galleryImages, ...additions] };
    });
  }

  function handleGalleryRemove(id: string) {
    setFormData((prev) => {
      const target = prev.galleryImages.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return { ...prev, galleryImages: prev.galleryImages.filter((image) => image.id !== id) };
    });
  }

  function updateField<K extends keyof InvitationFormData>(key: K, value: InvitationFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function updateParent(key: ParentKey, next: ParentInfo) {
    setFormData((prev) => ({ ...prev, [key]: next }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    setSubmitCount((count) => count + 1);

    if (Object.keys(validateInvitationForm(formData)).length === 0) {
      // 실제 제출/미리보기 전환은 harness-8lh.2.2(미리보기 태스크)에서 연결된다.
      // 이 태스크에서는 폼 상태(InvitationFormData)를 완성해 전달할 준비가
      // 됐다는 것만 확인한다.
      console.info('invitation form ready', formData);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>모바일 청첩장 만들기</p>
          <h1 className={styles.title}>
            두 분의 이야기를
            <br />
            정성껏 담아주세요
          </h1>
          <p className={styles.subtitle}>
            아래 정보를 채우면 청첩장 미리보기로 이어집니다. 계좌 정보는 공개하고 싶은 분만
            입력하셔도 괜찮아요.
          </p>
          <p className={styles.progress} aria-live="polite">
            <span className={styles.progressCount}>{completedCount}</span>
            <span> / {REQUIRED_FIELD_COUNT} 필수 항목 완료</span>
          </p>
        </header>

        {showFieldErrors && hasVisibleErrors && (
          <div ref={summaryRef} role="alert" tabIndex={-1} className={styles.errorSummary}>
            <h2 className={styles.errorSummaryTitle}>다시 한번 확인해주세요</h2>
            <ul className={styles.errorSummaryList}>
              {summaryMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        {submitSucceeded && (
          <div className={styles.successBanner} role="status">
            필수 정보를 모두 입력했어요. 다음 단계(미리보기)는 곧 이어집니다.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <Section title="대표 이미지" description="청첩장 상단에 크게 보여줄 사진 1장">
            <MainImageUpload
              previewUrl={formData.mainImagePreviewUrl}
              error={showFieldErrors ? errors.mainImage : undefined}
              onSelect={handleMainImageSelect}
            />
          </Section>

          <Section title="갤러리" description="본문 사이사이 보여줄 사진, 여러 장 선택할 수 있어요">
            <GalleryUpload
              images={formData.galleryImages}
              onAdd={handleGalleryAdd}
              onRemove={handleGalleryRemove}
            />
          </Section>

          <Section title="청첩장 소개">
            <div className={styles.field}>
              <label htmlFor="title" className={styles.label}>
                제목
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="예: 저희 결혼합니다"
                className={styles.input}
                aria-invalid={Boolean(showFieldErrors && errors.title)}
                aria-describedby={showFieldErrors && errors.title ? 'title-error' : undefined}
              />
              {showFieldErrors && errors.title && (
                <p id="title-error" className={styles.fieldError} role="alert">
                  {errors.title}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="content" className={styles.label}>
                내용
              </label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(event) => updateField('content', event.target.value)}
                placeholder="두 사람이 만나온 이야기, 하객분들께 전하고 싶은 인사말을 적어주세요."
                className={styles.textarea}
                rows={6}
                aria-invalid={Boolean(showFieldErrors && errors.content)}
                aria-describedby={showFieldErrors && errors.content ? 'content-error' : undefined}
              />
              {showFieldErrors && errors.content && (
                <p id="content-error" className={styles.fieldError} role="alert">
                  {errors.content}
                </p>
              )}
            </div>
          </Section>

          <Section title="예식 일정">
            <div className={styles.field}>
              <label htmlFor="weddingDateTime" className={styles.label}>
                예식 날짜 및 시간
              </label>
              <input
                id="weddingDateTime"
                type="datetime-local"
                value={formData.weddingDateTime}
                onChange={(event) => updateField('weddingDateTime', event.target.value)}
                className={styles.input}
                aria-invalid={Boolean(showFieldErrors && errors.weddingDateTime)}
                aria-describedby={
                  showFieldErrors && errors.weddingDateTime ? 'weddingDateTime-error' : undefined
                }
              />
              {showFieldErrors && errors.weddingDateTime && (
                <p id="weddingDateTime-error" className={styles.fieldError} role="alert">
                  {errors.weddingDateTime}
                </p>
              )}
            </div>
          </Section>

          <Section title="신랑 · 신부">
            <div className={styles.coupleRow}>
              <div className={styles.field}>
                <label htmlFor="groomName" className={styles.label}>
                  신랑 성함
                </label>
                <input
                  id="groomName"
                  type="text"
                  value={formData.groomName}
                  onChange={(event) => updateField('groomName', event.target.value)}
                  placeholder="예: 홍길동"
                  className={styles.input}
                  aria-invalid={Boolean(showFieldErrors && errors.groomName)}
                  aria-describedby={
                    showFieldErrors && errors.groomName ? 'groomName-error' : undefined
                  }
                />
                {showFieldErrors && errors.groomName && (
                  <p id="groomName-error" className={styles.fieldError} role="alert">
                    {errors.groomName}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="brideName" className={styles.label}>
                  신부 성함
                </label>
                <input
                  id="brideName"
                  type="text"
                  value={formData.brideName}
                  onChange={(event) => updateField('brideName', event.target.value)}
                  placeholder="예: 김영희"
                  className={styles.input}
                  aria-invalid={Boolean(showFieldErrors && errors.brideName)}
                  aria-describedby={
                    showFieldErrors && errors.brideName ? 'brideName-error' : undefined
                  }
                />
                {showFieldErrors && errors.brideName && (
                  <p id="brideName-error" className={styles.fieldError} role="alert">
                    {errors.brideName}
                  </p>
                )}
              </div>
            </div>
          </Section>

          <Section
            title="마음 전하실 곳"
            description="계좌 정보는 선택이지만, 하나라도 입력을 시작하면 네 칸을 모두 채워주세요."
          >
            <div className={styles.parentGroup}>
              <h3 className={styles.parentGroupTitle}>신랑측</h3>
              <div className={styles.parentGrid}>
                {(['groomFather', 'groomMother'] as ParentKey[]).map((key) => (
                  <ParentAccountFields
                    key={key}
                    idPrefix={key}
                    label={PARENT_LABELS[key]}
                    value={formData[key]}
                    errors={showFieldErrors ? errors[key] : undefined}
                    onChange={(next) => updateParent(key, next)}
                  />
                ))}
              </div>
            </div>

            <div className={styles.parentGroup}>
              <h3 className={styles.parentGroupTitle}>신부측</h3>
              <div className={styles.parentGrid}>
                {(['brideFather', 'brideMother'] as ParentKey[]).map((key) => (
                  <ParentAccountFields
                    key={key}
                    idPrefix={key}
                    label={PARENT_LABELS[key]}
                    value={formData[key]}
                    errors={showFieldErrors ? errors[key] : undefined}
                    onChange={(next) => updateParent(key, next)}
                  />
                ))}
              </div>
            </div>
          </Section>

          <div className={styles.submitBar}>
            <p className={styles.submitHelper}>
              {readyToSubmit
                ? '모든 필수 항목을 입력했어요.'
                : `필수 항목 ${REQUIRED_FIELD_COUNT - completedCount}개가 더 필요해요.`}
            </p>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={!readyToSubmit}
              aria-disabled={!readyToSubmit}
            >
              미리보기로 이동
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
