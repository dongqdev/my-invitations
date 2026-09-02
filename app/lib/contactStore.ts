import { promises as fs } from 'fs';
import path from 'path';
import type { ContactKey, WeddingContacts } from './contactTypes';

/**
 * 연락처(전화번호) 저장소 — `accountStore.ts`와 완전히 같은 패턴. 전화번호도
 * 개인정보라 public 레포(git)에는 절대 넣지 않고, git 워크트리 밖 서버 로컬
 * 경로에 슬러그별 JSON으로 둔다. 페이지는 `/api/contacts/<slug>`를 통해서만
 * 이 데이터를 읽는다.
 */

export type { ContactKey, WeddingContacts };

const DEFAULT_STORE_DIR = '/root/.my-invitations-contacts';

function getStoreDir(): string {
  return process.env.MY_INVITATIONS_CONTACTS_DIR ?? DEFAULT_STORE_DIR;
}

function assertSafeSlug(slug: string): void {
  if (!slug || slug.includes('/') || slug.includes('\\') || slug.includes('..')) {
    throw new Error(`유효하지 않은 슬러그입니다: ${JSON.stringify(slug)}`);
  }
}

function filePathFor(slug: string): string {
  assertSafeSlug(slug);
  return path.join(getStoreDir(), `${slug}.json`);
}

export async function saveContacts(slug: string, data: WeddingContacts): Promise<void> {
  const dir = getStoreDir();
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.writeFile(filePathFor(slug), JSON.stringify(data, null, 2), { mode: 0o600 });
}

export async function getContacts(slug: string): Promise<WeddingContacts | null> {
  try {
    const raw = await fs.readFile(filePathFor(slug), 'utf-8');
    return JSON.parse(raw) as WeddingContacts;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}
