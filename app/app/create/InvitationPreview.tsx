'use client';

import { useState } from 'react';
import type { WeddingAccounts } from '@/lib/accountTypes';
import type { InvitationFormData, ParentInfo } from './types';
import styles from './InvitationPreview.module.css';

/**
 * 부모님 계좌 정보(`ParentInfo.account`)를 `/api/confirm`이 받는 `WeddingAccounts`
 * 형태로 바꾼다. `app/create/validation.ts`의 `validateParentGroup`과 동일한 규칙 —
 * 네 칸(성함/은행/예금주/계좌번호)이 전부 채워진 그룹만 계좌로 포함한다. 폼 제출
 * 시점에 이미 이 검증을 통과했어야 하지만(반쯤 채워진 그룹은 제출 자체가 막힘),
 * 여기서도 다시 확인해 방어적으로 걸러낸다 — 실수로 빈 계좌 오브젝트가 저장소에
 * 들어가는 일을 막기 위함.
 */
function buildAccountsPayload(data: InvitationFormData): WeddingAccounts {
  const accounts: WeddingAccounts = {};

  (
    [
      ['groomFather', data.groomFather],
      ['groomMother', data.groomMother],
      ['brideFather', data.brideFather],
      ['brideMother', data.brideMother],
    ] as Array<[keyof WeddingAccounts, ParentInfo]>
  ).forEach(([key, parent]) => {
    const { bank, holder, accountNumber } = parent.account;
    if (bank.trim() && holder.trim() && accountNumber.trim()) {
      accounts[key] = {
        bank: bank.trim(),
        holder: holder.trim(),
        accountNumber: accountNumber.trim(),
      };
    }
  });

  return accounts;
}

interface InvitationPreviewProps {
  data: InvitationFormData;
  onEdit: () => void;
}

type ConfirmState = 'idle' | 'loading' | 'done' | 'error';

/** `<input type="datetime-local">` 값을 사람이 읽는 한국어 문장으로 바꾼다. */
function formatWeddingDateTime(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function InvitationPreview({ data, onEdit }: InvitationPreviewProps) {
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');
  const formattedDateTime = formatWeddingDateTime(data.weddingDateTime);

  async function handleConfirm() {
    setConfirmState('loading');
    try {
      // M5(정적 페이지 생성 + R2 업로드 + 배포) 파이프라인을 트리거하는 지점.
      // M5가 아직 구현되지 않아 /api/confirm 은 현재 스텁 응답만 돌려준다 —
      // 실제 파이프라인 연동은 M5 완료 후 이 fetch 호출은 그대로 두고 서버
      // 쪽 라우트(app/app/api/confirm/route.ts)만 채우면 된다.
      const response = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          groomName: data.groomName,
          brideName: data.brideName,
          weddingDateTime: data.weddingDateTime,
          mainImageUrl: data.mainImagePreviewUrl,
          galleryImageUrls: data.galleryImages.map((image) => image.previewUrl),
          groomFatherName: data.groomFather.name,
          groomMotherName: data.groomMother.name,
          brideFatherName: data.brideFather.name,
          brideMotherName: data.brideMother.name,
          accounts: buildAccountsPayload(data),
        }),
      });
      if (!response.ok) throw new Error(`unexpected status ${response.status}`);
      setConfirmState('done');
    } catch (error) {
      console.error('확정 요청 실패', error);
      setConfirmState('error');
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>미리보기</p>
        <h1 className={styles.pageTitle}>이렇게 보여요</h1>
        <p className={styles.pageSubtitle}>
          하객분들께 실제로 보이는 화면과 비슷한 형태예요. 마음에 들면 확정해주세요.
        </p>

        <article className={styles.card}>
          <div className={styles.hero}>
            {data.mainImagePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- 로컬 blob 미리보기, next/image 최적화 대상 아님
              <img src={data.mainImagePreviewUrl} alt="대표 이미지" className={styles.heroImage} />
            ) : (
              <div className={styles.heroPlaceholder} aria-hidden="true" />
            )}
            <div className={styles.heroOverlay}>
              <p className={styles.heroEyebrow}>WEDDING INVITATION</p>
              <h2 className={styles.heroTitle}>{data.title || '제목 없음'}</h2>
            </div>
          </div>

          <div className={styles.body}>
            <div className={styles.names}>
              <span>{data.groomName || '신랑'}</span>
              <span className={styles.namesHeart} aria-hidden="true">
                ♥
              </span>
              <span>{data.brideName || '신부'}</span>
            </div>

            {formattedDateTime && <p className={styles.dateTime}>{formattedDateTime}</p>}

            {data.content && <p className={styles.content}>{data.content}</p>}

            {data.galleryImages.length > 0 && (
              <div className={styles.gallery}>
                {data.galleryImages.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element -- 로컬 blob 미리보기
                  <img
                    key={image.id}
                    src={image.previewUrl}
                    alt="갤러리 이미지"
                    className={styles.galleryThumb}
                  />
                ))}
              </div>
            )}
          </div>
        </article>

        <p className={styles.note}>
          계좌 정보 등 나머지 항목은 정식 템플릿(다음 단계) 연결 시 함께 표시돼요.
        </p>

        <div className={styles.actionBar}>
          <button type="button" className={styles.editButton} onClick={onEdit}>
            편집
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={confirmState === 'loading'}
            aria-disabled={confirmState === 'loading'}
          >
            {confirmState === 'loading' ? '확정하는 중…' : '확정'}
          </button>
        </div>

        {confirmState === 'done' && (
          <p className={styles.confirmStatusDone} role="status">
            확정 요청을 접수했어요. (다음 단계 파이프라인은 준비 중이에요)
          </p>
        )}
        {confirmState === 'error' && (
          <p className={styles.confirmStatusError} role="alert">
            확정 요청에 실패했어요. 잠시 후 다시 시도해주세요.
          </p>
        )}
      </div>
    </main>
  );
}
