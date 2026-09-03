'use client';

import { useEffect, useRef, useState } from 'react';
import type { WeddingAccounts } from '@/lib/accountTypes';
import type { WeddingContacts } from '@/lib/contactTypes';
import type { InvitationFormData, ParentInfo, PhoneKey } from './types';
import styles from './InvitationPreview.module.css';

/**
 * 신랑/신부 본인 + 부모님 계좌 정보(`ParentInfo.account`)를 `/api/confirm`이 받는
 * `WeddingAccounts` 형태로 바꾼다(`groomOwn`/`brideOwn`은 `WeddingAccounts`의
 * `groom`/`bride` 키로 매핑). `app/create/validation.ts`의 `validateParentGroup`과
 * 동일한 규칙 — 네 칸(성함/은행/예금주/계좌번호)이 전부 채워진 그룹만 계좌로
 * 포함한다. 폼 제출 시점에 이미 이 검증을 통과했어야 하지만(반쯤 채워진 그룹은
 * 제출 자체가 막힘), 여기서도 다시 확인해 방어적으로 걸러낸다 — 실수로 빈 계좌
 * 오브젝트가 저장소에 들어가는 일을 막기 위함.
 */
function buildAccountsPayload(data: InvitationFormData): WeddingAccounts {
  const accounts: WeddingAccounts = {};

  (
    [
      ['groom', data.groomOwn],
      ['bride', data.brideOwn],
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

/** 연락처는 계좌와 달리 필드 하나(전화번호)뿐이라 트림 후 채워진 것만 옮기면 된다. */
function buildContactsPayload(data: InvitationFormData): WeddingContacts {
  const contacts: WeddingContacts = {};
  (Object.keys(data.phones) as PhoneKey[]).forEach((key) => {
    const value = data.phones[key].trim();
    if (value) contacts[key] = value;
  });
  return contacts;
}

interface InvitationPreviewProps {
  data: InvitationFormData;
  onEdit: () => void;
}

/**
 * - idle: 확정 전.
 * - confirming: `/api/confirm` 요청 진행 중(config.yaml 생성 + git commit/push,
 *   harness-a04q.4.2). 서버 렌더링(`/i/<slug>`)이라 GitHub Pages 재빌드 대기가
 *   없다 — 응답이 오면 바로 ready다.
 * - ready: 확정 성공 — 링크 복사 버튼을 보여준다.
 * - error: `/api/confirm` 요청 자체가 실패.
 */
type ConfirmState = 'idle' | 'confirming' | 'ready' | 'error';

export default function InvitationPreview({ data, onEdit }: InvitationPreviewProps) {
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');
  // 확정 성공 시 조립하는 공개 URL(`/i/<slug>`) — 서버 렌더링이라 별도 준비 대기가
  // 없다(harness-a04q.4.2).
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // 확정되면 링크를 받을 이메일(선택) — 확정 화면에서만 물어본다. 청첩장
  // 자체와는 무관한 배송용 정보라 InvitationFormData에는 넣지 않는다.
  const [email, setEmail] = useState('');

  // 실제 청첩장(main.html)을 그대로 렌더링해 iframe에 보여주는 라이브 미리보기.
  // 예전엔 이 컴포넌트가 직접 그린 축소 카드였는데("계좌 정보 등은 다음 단계에서")
  // 실제 완성물과 형태가 많이 달라 "부실하다"는 피드백을 받았다 — `/api/preview`가
  // 같은 생성 함수(generateNerdkimInvitation)로 만든 진짜 HTML을 돌려준다.
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) clearTimeout(copyResetTimerRef.current);
      if (previewDebounceRef.current !== null) clearTimeout(previewDebounceRef.current);
    };
  }, []);

  async function fetchPreviewHtml() {
    setPreviewLoading(true);
    try {
      const response = await fetch('/api/preview', {
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
          venueName: data.venueName,
          venueHall: data.venueHall,
          venueAddress: data.venueAddress,
          venueFloor: data.venueFloor,
          venueSubway: data.venueSubway,
          venueLat: data.venueLat,
          venueLng: data.venueLng,
          venueMapZoom: data.venueMapZoom,
          infoSubway: data.infoSubway,
          infoBus: data.infoBus,
          infoParking: data.infoParking,
          infoMeal: data.infoMeal,
          accounts: buildAccountsPayload(data),
          contacts: buildContactsPayload(data),
        }),
      });
      if (!response.ok) throw new Error(`unexpected status ${response.status}`);
      setPreviewHtml(await response.text());
    } catch (error) {
      console.error('미리보기 생성 실패', error);
    } finally {
      setPreviewLoading(false);
    }
  }

  useEffect(() => {
    if (previewDebounceRef.current !== null) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(() => {
      void fetchPreviewHtml();
    }, 350);
    return () => {
      if (previewDebounceRef.current !== null) clearTimeout(previewDebounceRef.current);
    };
    // data 전체를 얕게 비교할 방법이 마땅치 않아 그대로 의존성에 둔다 — 편집
    // 화면을 오가며 바뀔 때만 재요청되면 충분하고, 키 입력마다는 debounce가 막는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function handleConfirm() {
    setConfirmState('confirming');
    try {
      // 발행 파이프라인을 트리거하는 지점. 이미지 업로드(R2)는 InvitationForm.tsx의
      // handleSubmit에서 이미 끝났으므로 여기 도달한 시점에
      // mainImagePreviewUrl/galleryImages[].previewUrl은 R2 공개 URL이다.
      // 서버(app/app/api/confirm/route.ts)가 슬러그 확정 → 계좌/연락처 별도 저장 →
      // custom/<slug>/config.yaml 커밋+push까지 수행한다(harness-a04q.4.2). `/i/<slug>`가
      // 매 요청 서버 렌더링이라 GitHub Pages 재빌드 대기가 없다 — 응답이 오면 바로
      // ready로 전환한다(과거 harness-8lh.5.4의 폴링은 harness-a04q에서 제거됨).
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
          venueName: data.venueName,
          venueHall: data.venueHall,
          venueAddress: data.venueAddress,
          venueFloor: data.venueFloor,
          venueSubway: data.venueSubway,
          venueLat: data.venueLat,
          venueLng: data.venueLng,
          venueMapZoom: data.venueMapZoom,
          infoSubway: data.infoSubway,
          infoBus: data.infoBus,
          infoParking: data.infoParking,
          infoMeal: data.infoMeal,
          email: email.trim(),
          accounts: buildAccountsPayload(data),
          contacts: buildContactsPayload(data),
        }),
      });
      if (!response.ok) throw new Error(`unexpected status ${response.status}`);
      const result = (await response.json()) as { slug: string };
      setPublishedUrl(`${window.location.origin}/i/${result.slug}`);
      setConfirmState('ready');
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

        <div className={styles.phone}>
          <div className={styles.phoneNotch} aria-hidden="true" />
          <div className={styles.phoneScreen}>
            {previewHtml ? (
              <iframe
                key={previewHtml.length /* 내용이 바뀌면 스크롤 위치를 처음으로 되돌린다 */}
                srcDoc={previewHtml}
                title="청첩장 미리보기"
                className={styles.phoneFrame}
                sandbox="allow-scripts"
              />
            ) : (
              <div className={styles.phoneSkeleton} aria-hidden="true" />
            )}
            {previewLoading && (
              <div className={styles.phoneLoading} aria-hidden="true">
                <span className={styles.phoneLoadingDot} />
              </div>
            )}
          </div>
        </div>

        <p className={styles.note}>
          실제 청첩장 화면 그대로예요. 계좌·연락처도 입력하신 내용이 그대로 보여요.
        </p>

        {(confirmState === 'idle' || confirmState === 'confirming' || confirmState === 'error') && (
          <div className={styles.emailField}>
            <label htmlFor="notifyEmail" className={styles.emailLabel}>
              완성되면 링크 받을 이메일 (선택)
            </label>
            <p className={styles.emailHint}>
              나중에 브라우저에서 Ctrl+S(맥은 Cmd+S)로도 저장할 수 있어요.
            </p>
            <input
              id="notifyEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="예: name@example.com"
              className={styles.emailInput}
            />
          </div>
        )}

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
      </div>
    </main>
  );
}
