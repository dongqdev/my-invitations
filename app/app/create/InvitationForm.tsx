'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
import { uploadImageFile } from './uploadImage';
import styles from './InvitationForm.module.css';

const REQUIRED_FIELD_COUNT = 8;

function countCompletedRequiredFields(data: InvitationFormData): number {
  let count = 0;
  if (data.mainImage) count += 1;
  if (data.title.trim()) count += 1;
  if (data.content.trim()) count += 1;
  if (data.weddingDateTime) count += 1;
  if (data.groomName.trim()) count += 1;
  if (data.brideName.trim()) count += 1;
  if (data.venueName.trim()) count += 1;
  if (data.venueAddress.trim()) count += 1;
  return count;
}

/** 숫자 입력 필드(위도/경도/지도 확대 레벨)는 값이 비어 있으면 0으로 둔다 —
 * createEmptyInvitationFormData의 기본값과 같은 규약이며, 0은 "미입력"으로
 * 취급해 지도를 렌더링하지 않는다(원본 nerdkim 설계). */
function parseOptionalNumber(raw: string): number {
  if (raw.trim() === '') return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function Section({
  title,
  description,
  icon,
  accent,
  children,
}: {
  title: string;
  description?: string;
  /** 섹션 제목 앞에 놓일 장식용 아이콘. 기능과 무관한 시각 요소라 aria-hidden. */
  icon?: ReactNode;
  /** 아이콘 배지 색. 지정하지 않으면 기본(--color-primary)을 쓴다. */
  accent?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <div className={styles.sectionHeadingRow}>
          {icon && (
            <span
              className={styles.sectionIcon}
              style={accent ? ({ '--color-accent': accent } as CSSProperties) : undefined}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <h2 className={styles.sectionTitle}>{title}</h2>
        </div>
        {description && <p className={styles.sectionDescription}>{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** 아이콘은 전부 장식용(aria-hidden)이며 ImageUploads.tsx의 기존 라인아이콘
 * 컨벤션(currentColor, strokeWidth 1.5, 24x24 viewBox)을 그대로 따른다. */
function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" strokeLinecap="round" />
    </svg>
  );
}

function VenueIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 20 9 4l4 12 3-7 4 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SubwayIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="5" y="3.5" width="14" height="13" rx="4" />
      <path d="M5 12.5h14M9 20l-2 2M15 20l2 2" strokeLinecap="round" />
      <circle cx="9" cy="14.2" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14.2" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="4" y="4" width="16" height="13" rx="2.5" />
      <path d="M4 11h16M7 20v-1M17 20v-1" strokeLinecap="round" />
      <circle cx="8" cy="14" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ParkingIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M9.5 16V8h3a2.5 2.5 0 0 1 0 5h-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MealIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M7 3v7a2 2 0 0 0 4 0V3M9 10v11M17 3c-1.7 0-3 2-3 5s1.3 5 3 5v8"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface InvitationFormProps {
  /**
   * 필수 항목이 모두 채워진 상태로 제출됐을 때 호출된다. 이 시점의 폼
   * 상태(File 객체·blob 미리보기 URL 포함)를 그대로 넘긴다 — 실제 화면
   * 전환(미리보기 표시)은 호출하는 쪽(page.tsx)의 책임이다.
   */
  onSubmitSuccess: (data: InvitationFormData) => void;
}

export default function InvitationForm({ onSubmitSuccess }: InvitationFormProps) {
  const [formData, setFormData] = useState<InvitationFormData>(createEmptyInvitationFormData);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  function handleGalleryAdd(files: File[]) {
    setFormData((prev) => {
      const additions = files.map((file) => ({
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    setSubmitCount((count) => count + 1);

    if (Object.keys(validateInvitationForm(formData)).length !== 0) return;
    if (!formData.mainImage) return; // 위 검증에서 이미 걸러지지만 아래 타입 좁히기용

    setUploadError(null);
    setUploading(true);
    try {
      // 대표 이미지 + 갤러리 이미지를 R2에 업로드하고 그 공개 URL로 미리보기 URL을
      // 교체한다 — 이후 미리보기(InvitationPreview)는 blob URL이 아니라 이 R2 URL을 쓴다.
      const [mainImageUrl, galleryUrls] = await Promise.all([
        uploadImageFile(formData.mainImage),
        Promise.all(formData.galleryImages.map((image) => uploadImageFile(image.file))),
      ]);

      if (formData.mainImagePreviewUrl) URL.revokeObjectURL(formData.mainImagePreviewUrl);
      formData.galleryImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));

      const uploaded: InvitationFormData = {
        ...formData,
        mainImagePreviewUrl: mainImageUrl,
        galleryImages: formData.galleryImages.map((image, index) => ({
          ...image,
          previewUrl: galleryUrls[index],
        })),
      };

      setFormData(uploaded);
      onSubmitSuccess(uploaded);
    } catch (error) {
      console.error('이미지 업로드 실패', error);
      setUploadError('이미지 업로드에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setUploading(false);
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
          <div className={styles.progressWrap}>
            <p className={styles.progress} aria-live="polite">
              <span className={styles.progressCount}>{completedCount}</span>
              <span> / {REQUIRED_FIELD_COUNT} 필수 항목 완료</span>
            </p>
            <div className={styles.progressBarTrack} aria-hidden="true">
              <div
                className={styles.progressBarFill}
                style={{ width: `${(completedCount / REQUIRED_FIELD_COUNT) * 100}%` }}
              />
            </div>
          </div>
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

          <Section title="예식 일정" icon={<CalendarIcon />}>
            <div className={styles.field}>
              <label htmlFor="weddingDateTime" className={styles.label}>
                예식 날짜 및 시간
              </label>
              <div className={styles.dateTimeField}>
                <span className={styles.dateTimeIcon} aria-hidden="true">
                  <CalendarIcon />
                </span>
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
              </div>
              {showFieldErrors && errors.weddingDateTime && (
                <p id="weddingDateTime-error" className={styles.fieldError} role="alert">
                  {errors.weddingDateTime}
                </p>
              )}
            </div>
          </Section>

          <Section
            title="예식장 정보"
            description="청첩장 상단과 지도에 노출될 예식장 정보예요. 이름과 주소는 필수예요."
            icon={<VenueIcon />}
            accent="var(--color-accent-venue)"
          >
            <div className={styles.field}>
              <label htmlFor="venueName" className={styles.label}>
                예식장 이름
              </label>
              <input
                id="venueName"
                type="text"
                value={formData.venueName}
                onChange={(event) => updateField('venueName', event.target.value)}
                placeholder="예: 그랜드 컨벤션센터"
                className={styles.input}
                aria-invalid={Boolean(showFieldErrors && errors.venueName)}
                aria-describedby={
                  showFieldErrors && errors.venueName ? 'venueName-error' : undefined
                }
              />
              {showFieldErrors && errors.venueName && (
                <p id="venueName-error" className={styles.fieldError} role="alert">
                  {errors.venueName}
                </p>
              )}
            </div>

            <div className={styles.coupleRow}>
              <div className={styles.field}>
                <label htmlFor="venueHall" className={styles.label}>
                  홀 이름
                </label>
                <input
                  id="venueHall"
                  type="text"
                  value={formData.venueHall}
                  onChange={(event) => updateField('venueHall', event.target.value)}
                  placeholder="예: 3층 그랜드홀"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="venueFloor" className={styles.label}>
                  층 안내
                </label>
                <input
                  id="venueFloor"
                  type="text"
                  value={formData.venueFloor}
                  onChange={(event) => updateField('venueFloor', event.target.value)}
                  placeholder="예: 지하 1층 주차, 3층 예식"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="venueAddress" className={styles.label}>
                예식장 주소
              </label>
              <input
                id="venueAddress"
                type="text"
                value={formData.venueAddress}
                onChange={(event) => updateField('venueAddress', event.target.value)}
                placeholder="예: 서울특별시 강남구 테헤란로 000"
                className={styles.input}
                aria-invalid={Boolean(showFieldErrors && errors.venueAddress)}
                aria-describedby={
                  showFieldErrors && errors.venueAddress ? 'venueAddress-error' : undefined
                }
              />
              {showFieldErrors && errors.venueAddress && (
                <p id="venueAddress-error" className={styles.fieldError} role="alert">
                  {errors.venueAddress}
                </p>
              )}
            </div>

            <div className={styles.coupleRow}>
              <div className={styles.field}>
                <label htmlFor="venueSubway" className={styles.label}>
                  지하철 안내 (예식장 최인접역)
                </label>
                <p className={styles.fieldHelp}>
                  청첩장 상단 요약에 짧게 노출돼요. 하객 대상 상세 대중교통 안내는 아래
                  &ldquo;오시는 길 안내&rdquo; 섹션에 따로 입력해요.
                </p>
                <input
                  id="venueSubway"
                  type="text"
                  value={formData.venueSubway}
                  onChange={(event) => updateField('venueSubway', event.target.value)}
                  placeholder="예: 2호선 강남역 3번 출구에서 도보 5분"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="venueSubwayShort" className={styles.label}>
                  지하철 안내 축약형
                </label>
                <p className={styles.fieldHelp}>지도 근처에 짧게 표시할 한 줄이에요.</p>
                <input
                  id="venueSubwayShort"
                  type="text"
                  value={formData.venueSubwayShort}
                  onChange={(event) => updateField('venueSubwayShort', event.target.value)}
                  placeholder="예: 2호선 강남역"
                  className={styles.input}
                />
              </div>
            </div>

            <details className={styles.disclosure}>
              <summary className={styles.disclosureSummary}>지도 좌표 입력 (선택)</summary>
              <div className={styles.disclosureBody}>
                <p className={styles.fieldHelp}>
                  비워두면 지도 없이 주소/지하철 안내 텍스트만 보여줘요. 입력하려면 세 칸을 모두
                  채워주세요.
                </p>
                <div className={styles.venueMapRow}>
                  <div className={styles.field}>
                    <label htmlFor="venueLat" className={styles.label}>
                      위도
                    </label>
                    <input
                      id="venueLat"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={formData.venueLat === 0 ? '' : formData.venueLat}
                      onChange={(event) =>
                        updateField('venueLat', parseOptionalNumber(event.target.value))
                      }
                      placeholder="예: 37.4979"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="venueLng" className={styles.label}>
                      경도
                    </label>
                    <input
                      id="venueLng"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={formData.venueLng === 0 ? '' : formData.venueLng}
                      onChange={(event) =>
                        updateField('venueLng', parseOptionalNumber(event.target.value))
                      }
                      placeholder="예: 127.0276"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="venueMapZoom" className={styles.label}>
                      지도 확대 레벨
                    </label>
                    <input
                      id="venueMapZoom"
                      type="number"
                      step="1"
                      inputMode="numeric"
                      value={formData.venueMapZoom === 0 ? '' : formData.venueMapZoom}
                      onChange={(event) =>
                        updateField('venueMapZoom', parseOptionalNumber(event.target.value))
                      }
                      placeholder="예: 17"
                      className={styles.input}
                    />
                  </div>
                </div>
              </div>
            </details>
          </Section>

          <Section
            title="오시는 길 안내"
            description="하객들에게 보여줄 대중교통·주차·식사 안내 문구예요. 여러 줄로 나눠 적으면 그대로 줄바꿈돼요. 모두 선택 입력이에요."
            icon={<RouteIcon />}
            accent="var(--color-accent-route)"
          >
            <p className={styles.fieldHelp}>
              위 &ldquo;예식장 정보&rdquo;의 지하철 안내와는 달라요 — 저건 청첩장 상단에 짧게
              노출되는 요약이고, 여기는 오시는 길 섹션에 들어갈 상세 안내예요.
            </p>
            <div className={styles.routeGrid}>
              <div className={styles.routeCard}>
                <label htmlFor="infoSubway" className={styles.routeCardLabel}>
                  <SubwayIcon />
                  지하철
                </label>
                <textarea
                  id="infoSubway"
                  value={formData.infoSubway}
                  onChange={(event) => updateField('infoSubway', event.target.value)}
                  placeholder={'예: 2호선 강남역 3번 출구\n도보 5분 거리예요.'}
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <div className={styles.routeCard}>
                <label htmlFor="infoBus" className={styles.routeCardLabel}>
                  <BusIcon />
                  버스
                </label>
                <textarea
                  id="infoBus"
                  value={formData.infoBus}
                  onChange={(event) => updateField('infoBus', event.target.value)}
                  placeholder={'예: 간선버스 146, 360\n지선버스 3412'}
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <div className={styles.routeCard}>
                <label htmlFor="infoParking" className={styles.routeCardLabel}>
                  <ParkingIcon />
                  주차
                </label>
                <textarea
                  id="infoParking"
                  value={formData.infoParking}
                  onChange={(event) => updateField('infoParking', event.target.value)}
                  placeholder={'예: 건물 지하 1~3층 주차 가능\n예식 3시간 무료'}
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <div className={styles.routeCard}>
                <label htmlFor="infoMeal" className={styles.routeCardLabel}>
                  <MealIcon />
                  식사
                </label>
                <textarea
                  id="infoMeal"
                  value={formData.infoMeal}
                  onChange={(event) => updateField('infoMeal', event.target.value)}
                  placeholder={'예: 3층 뷔페 레스토랑\n식사 시간 11:30~14:30'}
                  className={styles.textarea}
                  rows={3}
                />
              </div>
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
              <h3 className={`${styles.parentGroupTitle} ${styles.parentGroupTitleGroom}`}>
                신랑측
              </h3>
              <div className={styles.parentGrid}>
                {(['groomFather', 'groomMother'] as ParentKey[]).map((key) => (
                  <ParentAccountFields
                    key={key}
                    idPrefix={key}
                    label={PARENT_LABELS[key]}
                    side="groom"
                    value={formData[key]}
                    errors={showFieldErrors ? errors[key] : undefined}
                    onChange={(next) => updateParent(key, next)}
                  />
                ))}
              </div>
            </div>

            <div className={styles.parentGroup}>
              <h3 className={`${styles.parentGroupTitle} ${styles.parentGroupTitleBride}`}>
                신부측
              </h3>
              <div className={styles.parentGrid}>
                {(['brideFather', 'brideMother'] as ParentKey[]).map((key) => (
                  <ParentAccountFields
                    key={key}
                    idPrefix={key}
                    label={PARENT_LABELS[key]}
                    side="bride"
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
              {uploading
                ? '이미지를 업로드하는 중이에요…'
                : readyToSubmit
                  ? '모든 필수 항목을 입력했어요.'
                  : `필수 항목 ${REQUIRED_FIELD_COUNT - completedCount}개가 더 필요해요.`}
            </p>
            {uploadError && (
              <p role="alert" className={styles.fieldError}>
                {uploadError}
              </p>
            )}
            <button
              type="submit"
              className={styles.submitButton}
              disabled={!readyToSubmit || uploading}
              aria-disabled={!readyToSubmit || uploading}
            >
              {uploading ? '업로드하는 중…' : '미리보기로 이동'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
