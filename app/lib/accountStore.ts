import { promises as fs } from 'fs';
import path from 'path';

/**
 * 계좌 정보(신랑/신부 본인 + 혼주 4그룹) 저장소.
 *
 * my-invitations 레포는 public이고, 확정된 청첩장은 정적 HTML로 이 레포에 git
 * commit/push되어 GitHub Pages로 서빙된다(harness-8lh.5). 계좌번호를 그 정적
 * HTML/git 커밋에 그대로 넣으면 public 레포 히스토리에 계좌번호가 영구 노출되므로,
 * 계좌 데이터는 이 앱의 git 워크트리(추적 대상 디렉토리) **밖**의 서버 로컬 경로에
 * 슬러그별 JSON 파일로 따로 보관한다. 페이지는 별도 조회 API(harness-8lh.4.2,
 * `/api/accounts/<slug>`)를 통해서만 이 데이터를 읽는다 — git에는 절대 들어가지 않는다.
 *
 * 저장 위치는 기본적으로 `/root/.my-invitations-accounts/<slug>.json` — neko의
 * `/root/.neko/chromium-profile`과 같은 패턴(서버 로컬 영속 상태를 홈 디렉터리
 * dot-폴더에 둠, `/app/DEVELOPMENT.md` 참고). R2(공개 버킷)는 쓰지 않는다 — R2는
 * 공개 도메인으로 서빙되므로 계좌처럼 "조회 API 뒤에서만" 접근 가능해야 하는
 * 데이터를 두기에 맞지 않는다. `MY_INVITATIONS_ACCOUNTS_DIR` 환경변수로 저장 위치를
 * 재정의할 수 있다(테스트 등).
 *
 * 서버 전용 모듈이다 — 클라이언트 컴포넌트에서 import하지 말 것(Node `fs` API를 쓴다).
 */

export interface BankAccountInfo {
  bank: string;
  holder: string;
  accountNumber: string;
}

export type ParentAccountKey = 'groomFather' | 'groomMother' | 'brideFather' | 'brideMother';

/**
 * 슬러그(신랑_신부이름) 하나에 대한 계좌 정보 묶음. 신랑/신부 본인 계좌와 혼주 4그룹
 * 전부 선택 항목이다 — 공개하지 않기로 한 항목은 필드째 생략(undefined)한다. 슬러그
 * 생성 규칙 자체는 harness-8lh.5.1의 몫이라 여기서는 이미 만들어진 문자열 키로만
 * 다룬다.
 */
export interface WeddingAccounts {
  /** 신랑 본인 계좌 */
  groom?: BankAccountInfo;
  /** 신부 본인 계좌 */
  bride?: BankAccountInfo;
  groomFather?: BankAccountInfo;
  groomMother?: BankAccountInfo;
  brideFather?: BankAccountInfo;
  brideMother?: BankAccountInfo;
}

const DEFAULT_STORE_DIR = '/root/.my-invitations-accounts';

function getStoreDir(): string {
  return process.env.MY_INVITATIONS_ACCOUNTS_DIR ?? DEFAULT_STORE_DIR;
}

/**
 * 슬러그는 파일 경로의 일부로 쓰이므로, 경로 구분자나 상위 디렉터리 탈출 시도가
 * 섞인 값을 걸러낸다(경로 순회 방지).
 */
function assertSafeSlug(slug: string): void {
  if (!slug || slug.includes('/') || slug.includes('\\') || slug.includes('..')) {
    throw new Error(`유효하지 않은 슬러그입니다: ${JSON.stringify(slug)}`);
  }
}

function filePathFor(slug: string): string {
  assertSafeSlug(slug);
  return path.join(getStoreDir(), `${slug}.json`);
}

/**
 * 슬러그 키로 계좌 정보를 저장한다(있으면 덮어쓴다). 파일 기반이라 개발 서버가
 * 재시작돼도 데이터가 남는다.
 */
export async function saveAccounts(slug: string, data: WeddingAccounts): Promise<void> {
  const dir = getStoreDir();
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.writeFile(filePathFor(slug), JSON.stringify(data, null, 2), { mode: 0o600 });
}

/** 슬러그 키로 계좌 정보를 조회한다. 저장된 적 없으면 `null`을 반환한다. */
export async function getAccounts(slug: string): Promise<WeddingAccounts | null> {
  try {
    const raw = await fs.readFile(filePathFor(slug), 'utf-8');
    return JSON.parse(raw) as WeddingAccounts;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}
