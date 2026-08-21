'use client';

import { useEffect, useRef, useState } from 'react';
import type { WeddingAccounts } from '@/lib/accountTypes';
import type { InvitationFormData, ParentInfo } from './types';
import styles from './InvitationPreview.module.css';

/**
 * 배포 상태 폴링 설정(harness-8lh.5.4) — git push 이후 GitHub Pages 재빌드가
 * 끝나 실제로 링크가 열람 가능해지기까지 서버(`/api/publish-status/<slug>`)를
 * 주기적으로 확인한다. 5초 간격 * 24회 = 최대 2분까지만 기다리고, 그 이상은
 * 타임아웃으로 전환해 사용자가 수동으로 다시 확인할 수 있게 한다(과하게 오래
 * 기다리게 하지 않는다).
 */
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 24;

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

/**
 * - idle: 확정 전.
 * - confirming: `/api/confirm` 요청 진행 중(정적 페이지 생성 + git commit/push).
 * - publishing: push는 끝났고, GitHub Pages 재빌드로 링크가 실제로 열람
 *   가능해지길 기다리며 `/api/publish-status/<slug>`를 폴링하는 중.
 * - ready: 폴링으로 200 확인 완료 — 링크 복사 버튼을 보여준다.
 * - timeout: 폴링 상한(MAX_POLL_ATTEMPTS)에 도달 — 수동 재확인을 안내한다.
 * - error: `/api/confirm` 요청 자체가 실패.
 */
type ConfirmState = 'idle' | 'confirming' | 'publishing' | 'ready' | 'timeout' | 'error';

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
  // 확정 응답이 준 slug — 폴링 API 경로(/api/publish-status/<slug>)를 만드는 데 쓴다.
  const [slug, setSlug] = useState<string | null>(null);
  // 폴링이 ready로 끝났을 때 서버가 함께 준 공개 URL. 클라이언트에서 별도로
  // `https://blog.dongq.dev/...` 문자열을 다시 조립하지 않고 서버 응답을 그대로
  // 써서, base URL이 바뀌어도(테스트 등) 표시/복사되는 링크가 항상 서버가 실제로
  // 200을 확인한 그 URL과 일치하게 한다.
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptRef = useRef(0);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formattedDateTime = formatWeddingDateTime(data.weddingDateTime);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current !== null) clearTimeout(pollTimeoutRef.current);
      if (copyResetTimerRef.current !== null) clearTimeout(copyResetTimerRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollTimeoutRef.current !== null) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }

  /**
   * `/api/publish-status/<slug>`를 한 번 확인하고, 아직 준비 안 됐으면
   * `POLL_INTERVAL_MS` 뒤 스스로를 다시 예약한다. 상한(`MAX_POLL_ATTEMPTS`)에
   * 도달하면 'timeout'으로 전환하고 멈춘다. 네트워크 오류는 일시적일 수 있으니
   * 즉시 실패 처리하지 않고 다음 시도로 넘어간다(브라우저에서 blog.dongq.dev로
   * 직접 fetch하지 않는 이유는 CORS — 이 확인은 항상 같은 오리진의 이 API를
   * 통해서만 한다).
   */
  async function pollOnce(targetSlug: string) {
    try {
      const response = await fetch(`/api/publish-status/${encodeURIComponent(targetSlug)}`);
      if (response.ok) {
        const result = (await response.json()) as { ready: boolean; url: string };
        if (result.ready) {
          setPublishedUrl(result.url);
          setConfirmState('ready');
          return;
        }
      }
    } catch (error) {
      console.error('배포 상태 폴링 실패', error);
    }

    pollAttemptRef.current += 1;
    if (pollAttemptRef.current >= MAX_POLL_ATTEMPTS) {
      setConfirmState('timeout');
      return;
    }
    pollTimeoutRef.current = setTimeout(() => void pollOnce(targetSlug), POLL_INTERVAL_MS);
  }

  function startPolling(targetSlug: string) {
    stopPolling();
    pollAttemptRef.current = 0;
    setConfirmState('publishing');
    pollTimeoutRef.current = setTimeout(() => void pollOnce(targetSlug), POLL_INTERVAL_MS);
  }

  /** 타임아웃 이후 사용자가 '다시 확인' 버튼을 눌렀을 때 — 시도 횟수를 리셋하고 재개. */
  function handleRetryPolling() {
    if (!slug) return;
    startPolling(slug);
  }

  async function handleConfirm() {
    setConfirmState('confirming');
    try {
      // M5(정적 페이지 생성 + R2 업로드 + 배포) 파이프라인을 트리거하는 지점.
      // 이미지 업로드(R2)는 InvitationForm.tsx의 handleSubmit에서 이미 끝났으므로
      // 여기 도달한 시점에 mainImagePreviewUrl/galleryImages[].previewUrl은 R2
      // 공개 URL이다(harness-8lh.5.2). 서버(app/app/api/confirm/route.ts)가
      // 슬러그 확정 → 계좌 별도 저장 → custom/<slug>/index.html 정적 생성 →
      // git commit/push(harness-8lh.5.3)까지 수행한다. push까지 끝나도 GitHub
      // Pages 재빌드가 남아있으므로, 여기서는 바로 'ready'로 두지 않고 폴링을
      // 시작한다(harness-8lh.5.4).
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
      const result = (await response.json()) as { slug: string };
      setSlug(result.slug);
      startPolling(result.slug);
    } catch (error) {
      console.error('확정 요청 실패', error);
      setConfirmState('error');
    }
  }

  /** '링크 복사' 버튼 — AccountSection/BottomBar와 동일한 clipboard+토스트 패턴. */
  async function handleCopyLink() {
    if (!publishedUrl) return;
    try {
      await navigator.clipboard.writeText(publishedUrl);
    } catch {
      // 클립보드 API가 없거나 권한이 없는 환경 — 다른 컴포넌트와 동일하게 조용히 무시.
      return;
    }
    if (copyResetTimerRef.current !== null) clearTimeout(copyResetTimerRef.current);
    setCopied(true);
    copyResetTimerRef.current = setTimeout(() => setCopied(false), 1600);
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

        {(confirmState === 'idle' || confirmState === 'confirming' || confirmState === 'error') && (
          <div className={styles.actionBar}>
            <button type="button" className={styles.editButton} onClick={onEdit}>
              편집
            </button>
            <button
              type="button"
              className={styles.confirmButton}
              onClick={handleConfirm}
              disabled={confirmState === 'confirming'}
              aria-disabled={confirmState === 'confirming'}
            >
              {confirmState === 'confirming' ? '확정하는 중…' : '확정'}
            </button>
          </div>
        )}

        {confirmState === 'error' && (
          <p className={styles.confirmStatusError} role="alert">
            확정 요청에 실패했어요. 잠시 후 다시 시도해주세요.
          </p>
        )}

        {confirmState === 'publishing' && (
          <div className={styles.statusPanel} role="status">
            {/* push(harness-8lh.5.3)까지는 끝났지만, GitHub Pages 재빌드로 실제
                링크가 열람 가능해지기까지는 지연이 있다 — 그 대기를 보여준다. */}
            <div className={styles.statusRow}>
              <span className={styles.spinner} aria-hidden="true" />
              <p className={styles.statusMessage}>청첩장 페이지를 배포하는 중이에요…</p>
            </div>
            <p className={styles.statusHint}>페이지가 반영되기까지 최대 2분 정도 걸릴 수 있어요.</p>
          </div>
        )}

        {confirmState === 'ready' && publishedUrl && (
          <div className={styles.statusPanel} role="status">
            <p className={styles.statusMessage}>청첩장이 배포됐어요!</p>
            <div className={styles.copyButtonWrap}>
              <span className={styles.copyToast} data-visible={copied} aria-live="polite">
                {copied ? '링크가 복사되었습니다' : ''}
              </span>
              <button
                type="button"
                className={styles.linkCopyButton}
                onClick={() => void handleCopyLink()}
              >
                링크 복사
              </button>
            </div>
          </div>
        )}

        {confirmState === 'timeout' && (
          <div className={styles.statusPanel} role="status">
            <p className={styles.statusMessage}>배포 확인에 시간이 걸리고 있어요.</p>
            <p className={styles.statusHint}>잠시 후 다시 확인해주세요.</p>
            <button type="button" className={styles.retryButton} onClick={handleRetryPolling}>
              다시 확인
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
