'use client';

import { useEffect, useRef, useState } from 'react';
import type { BankAccountInfo, WeddingAccounts } from './accountTypes';
import styles from './AccountSection.module.css';

type AccountSide = 'groom' | 'bride';

export interface AccountSectionProps {
  /**
   * 청첩장 슬러그. `/api/accounts/<slug>` 조회에 쓰인다 — 뷰 데이터(`InvitationViewData`)에
   * 섞지 않고 별도 prop으로 받는다(계좌를 뷰 데이터에서 제외하는 이유는
   * `types.ts`/`ParentsSection.tsx` 주석 참고).
   */
  slug: string;
  /**
   * 계좌 정보를 가져오는 함수. 기본값은 실제 `/api/accounts/<slug>`를 호출한다.
   *
   * `/invite/preview` 데모 라우트처럼 실제 API 서버가 없는 곳에서는 이 prop에 mock
   * 함수를 주입해서 같은 컴포넌트로 데모를 구성한다 — 계좌 데이터를 정적 페이지의
   * 최초 HTML에 넣지 않는다는 원칙(harness-8lh.5의 정적 생성 대비)은 실제 fetch든
   * mock fetch든 동일하게 지켜진다: 두 경우 모두 버튼을 클릭해 이 함수가 호출되기
   * 전까지는 계좌 데이터가 컴포넌트 상태에 존재하지 않는다.
   */
  fetchAccounts?: (slug: string) => Promise<WeddingAccounts>;
}

async function fetchAccountsFromApi(slug: string): Promise<WeddingAccounts> {
  const response = await fetch(`/api/accounts/${encodeURIComponent(slug)}`);
  if (!response.ok) {
    throw new Error(`계좌 정보 조회 실패 (status ${response.status})`);
  }
  return (await response.json()) as WeddingAccounts;
}

const SIDE_LABEL: Record<AccountSide, string> = {
  groom: '신랑',
  bride: '신부',
};

interface AccountEntry {
  key: string;
  label: string;
  info: BankAccountInfo;
}

/** 한쪽(신랑/신부)의 본인 계좌 + 그 쪽 혼주(아버지/어머니) 계좌를 표시 순서대로 뽑는다. */
function entriesForSide(side: AccountSide, accounts: WeddingAccounts): AccountEntry[] {
  const sideLabel = SIDE_LABEL[side];
  const own = side === 'groom' ? accounts.groom : accounts.bride;
  const father = side === 'groom' ? accounts.groomFather : accounts.brideFather;
  const mother = side === 'groom' ? accounts.groomMother : accounts.brideMother;

  const entries: AccountEntry[] = [];
  if (own) entries.push({ key: `${side}-own`, label: `${sideLabel} 계좌`, info: own });
  if (father)
    entries.push({ key: `${side}-father`, label: `${sideLabel}측 아버지 계좌`, info: father });
  if (mother)
    entries.push({ key: `${side}-mother`, label: `${sideLabel}측 어머니 계좌`, info: mother });
  return entries;
}

/**
 * 계좌 아코디언 섹션 — "신랑 측 계좌번호" / "신부 측 계좌번호" 버튼 각각을 눌러 해당
 * 측 본인 계좌 + 혼주 계좌를 펼쳐 보여준다.
 *
 * 레퍼런스(blog.dongq.dev/my-invitations/.../parkseongjoo)는 모달로 이 정보를
 * 띄우지만, 이 앱은 Gallery 라이트박스 정도의 단순 오버레이 톤을 이미 갖고 있어
 * 여기서는 별도 모달 레이어 없이 인라인 아코디언으로 편다 — 버튼 바로 아래에서
 * 펼쳐지므로 탭했을 때 시선 이동이 적고, 두 번째 태스크(harness-0i2.4.2)가 붙일
 * 복사 버튼도 같은 흐름 안에 자연스럽게 들어간다.
 *
 * 계좌 데이터는 최초 렌더에 없다(`accounts: null`) — 버튼을 처음 클릭할 때만
 * `fetchAccounts`를 호출해 상태에 저장하고, 이후 같은 세션에서는 재요청하지 않는다.
 * 이 컴포넌트가 서버에서 렌더링되더라도(Next.js) 초기 HTML에는 계좌 데이터가 전혀
 * 포함되지 않는다 — 클릭이라는 클라이언트 이벤트가 있어야만 fetch가 실행된다.
 */
export default function AccountSection({
  slug,
  fetchAccounts = fetchAccountsFromApi,
}: AccountSectionProps) {
  const [accounts, setAccounts] = useState<WeddingAccounts | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [openSide, setOpenSide] = useState<AccountSide | null>(null);
  // 방금 복사된 카드의 key. 카드가 여러 장 동시에 펼쳐지므로 "복사됨" 피드백이 클릭한
  // 그 카드에만 뜨도록 side/entry 단위가 아니라 entry.key 단위로 추적한다.
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current !== null) clearTimeout(copyResetTimer.current);
    };
  }, []);

  async function handleCopy(entry: AccountEntry) {
    try {
      await navigator.clipboard.writeText(entry.info.accountNumber);
    } catch {
      // 클립보드 API가 없거나(구형 브라우저) 권한이 없는 환경 — 조용히 무시한다.
      // 이 앱 규모에서는 별도 폴리필/알림을 두지 않는다.
      return;
    }
    if (copyResetTimer.current !== null) clearTimeout(copyResetTimer.current);
    setCopiedKey(entry.key);
    copyResetTimer.current = setTimeout(() => setCopiedKey(null), 1600);
  }

  async function ensureAccountsLoaded() {
    if (accounts !== null || status === 'loading') return;
    setStatus('loading');
    try {
      const data = await fetchAccounts(slug);
      setAccounts(data);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  function handleToggle(side: AccountSide) {
    setOpenSide((current) => (current === side ? null : side));
    // 펼친 뒤(닫는 클릭이 아니라 여는 클릭일 때)에만 로드를 시도한다 — 이미 로드됐으면
    // ensureAccountsLoaded 내부에서 조용히 반환한다.
    void ensureAccountsLoaded();
  }

  return (
    <section className={styles.section} aria-label="계좌 안내">
      <p className={styles.label}>ACCOUNT</p>
      <p className={styles.hint}>마음 전하실 곳을 안내해 드려요</p>

      <div className={styles.buttonRow}>
        {(Object.keys(SIDE_LABEL) as AccountSide[]).map((side) => {
          const isOpen = openSide === side;
          return (
            <button
              key={side}
              id={`account-toggle-${side}`}
              type="button"
              className={styles.toggleButton}
              aria-expanded={isOpen}
              aria-controls={`account-panel-${side}`}
              onClick={() => handleToggle(side)}
            >
              <span>{SIDE_LABEL[side]} 측 계좌번호</span>
              <svg
                aria-hidden="true"
                className={styles.chevron}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          );
        })}
      </div>

      {(Object.keys(SIDE_LABEL) as AccountSide[]).map((side) => {
        const isOpen = openSide === side;
        const entries = accounts ? entriesForSide(side, accounts) : [];
        return (
          <div
            key={side}
            id={`account-panel-${side}`}
            role="region"
            aria-labelledby={`account-toggle-${side}`}
            className={styles.panel}
            data-open={isOpen}
          >
            <div className={styles.panelInner}>
              <div className={styles.panelContent}>
                {isOpen && status === 'loading' && accounts === null && (
                  <p className={styles.status}>계좌 정보를 불러오는 중…</p>
                )}
                {isOpen && status === 'error' && (
                  <p className={styles.statusError}>
                    계좌 정보를 불러오지 못했습니다. 다시 시도해 주세요.
                  </p>
                )}
                {isOpen && accounts !== null && entries.length === 0 && (
                  <p className={styles.status}>등록된 계좌 정보가 없습니다.</p>
                )}
                {isOpen && entries.length > 0 && (
                  <ul className={styles.accountList}>
                    {entries.map((entry) => (
                      <li key={entry.key} className={styles.accountCard}>
                        <p className={styles.accountLabel}>{entry.label}</p>
                        <p className={styles.accountBank}>{entry.info.bank}</p>
                        <div className={styles.accountNumberRow}>
                          <p className={styles.accountNumber}>{entry.info.accountNumber}</p>
                          <button
                            type="button"
                            className={styles.copyButton}
                            onClick={() => void handleCopy(entry)}
                          >
                            계좌번호 복사
                          </button>
                        </div>
                        <p className={styles.accountHolder}>예금주 {entry.info.holder}</p>
                        <span
                          className={styles.copyToast}
                          data-visible={copiedKey === entry.key}
                          aria-live="polite"
                        >
                          {copiedKey === entry.key ? '복사됨' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
