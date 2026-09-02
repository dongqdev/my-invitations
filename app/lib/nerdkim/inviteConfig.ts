import { promises as fs } from 'fs';
import path from 'path';
import type { NerdkimInvitationInput } from './generateInvitation';

/**
 * 청첩장 데이터 저장소 — `accountStore.ts`/`contactStore.ts`와 완전히 같은 패턴.
 * 처음엔 git(`custom/<slug>/config.yaml`)에 커밋했으나(harness-a04q), 계좌/연락처는
 * 이미 서버 로컬에만 있어 저장 방식이 갈려 있는 게("이원화") 관리 부담이라는 사용자
 * 판단으로 서버 로컬로 통일했다 — git에는 이제 코드만 남고, 청첩장 데이터의 git
 * 버전관리(변경이력)는 포기하는 대신 저장 위치를 계좌/연락처와 하나로 모은다.
 */
export type InviteConfig = Omit<NerdkimInvitationInput, 'slug'>;

const DEFAULT_STORE_DIR = '/root/.my-invitations-configs';

function getStoreDir(): string {
  return process.env.MY_INVITATIONS_CONFIGS_DIR ?? DEFAULT_STORE_DIR;
}

/** 슬러그는 파일 경로의 일부다 — 경로 구분자·상위 디렉터리 탈출 시도를 걸러낸다. */
function assertSafeSlug(slug: string): void {
  if (!slug || slug.includes('/') || slug.includes('\\') || slug.includes('..')) {
    throw new Error(`유효하지 않은 슬러그입니다: ${JSON.stringify(slug)}`);
  }
}

function filePathFor(slug: string): string {
  assertSafeSlug(slug);
  return path.join(getStoreDir(), `${slug}.json`);
}

/** 슬러그 키로 청첩장 데이터를 저장한다(있으면 덮어쓴다). */
export async function saveInviteConfig(slug: string, config: InviteConfig): Promise<void> {
  const dir = getStoreDir();
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.writeFile(filePathFor(slug), JSON.stringify(config, null, 2), { mode: 0o600 });
}

/**
 * 슬러그 키로 청첩장 데이터를 읽어 `NerdkimInvitationInput`으로 반환한다. 저장된
 * 적 없으면 null을 반환한다(호출자가 404로 대응할 수 있게 — throw하지 않는다).
 */
export async function loadInviteConfig(slug: string): Promise<NerdkimInvitationInput | null> {
  try {
    const raw = await fs.readFile(filePathFor(slug), 'utf-8');
    const config = JSON.parse(raw) as InviteConfig;
    return { ...config, slug };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/** 슬러그 충돌 검사용 — `lib/slug.ts`의 `resolveInvitationSlug`가 기본 checkExists로 쓴다. */
export async function inviteConfigExists(slug: string): Promise<boolean> {
  return (await loadInviteConfig(slug)) !== null;
}
