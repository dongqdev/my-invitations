import { promises as fs } from 'fs';
import path from 'path';

/**
 * 슬러그별 "예식 일시 + (선택) 통보용 이메일" 메타데이터 저장소.
 *
 * 목적은 자동삭제(사용자 요청, 2026-08-23): 예식일로부터 30일이 지난
 * 청첩장을 스케줄러(`scripts/cleanupExpiredInvitations.mjs`)가 자동으로
 * 지운다. 처음엔 "custom/20261102/" 처럼 슬러그 자체를 날짜로 바꾸는 안이
 * 나왔지만, 이미 하객들에게 공유된 사람이름 기반 슬러그(예:
 * custom/donggyu_jongchang/)를 바꾸면 기존 링크가 깨진다 — 그래서 슬러그는
 * 그대로 두고, 이 파일이 "그 슬러그의 예식일시"만 별도로 기억한다.
 *
 * accountStore.ts와 같은 이유로 git 워크트리 밖(`/root/.my-invitations-meta/`)에
 * 슬러그별 JSON으로 둔다 — 계좌처럼 극비는 아니지만 청첩장 페이지 자체와
 * 수명주기가 다른 운영 데이터라 정적 산출물에 섞지 않는다.
 *
 * 서버 전용 모듈이다(Node `fs`).
 */

const DEFAULT_STORE_DIR = '/root/.my-invitations-meta';

function getStoreDir(): string {
  return process.env.MY_INVITATIONS_META_DIR ?? DEFAULT_STORE_DIR;
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

export interface InvitationMeta {
  /** "YYYY-MM-DDTHH:mm" 형식(datetime-local 값 그대로, KST 벽시계 시각). */
  weddingDateTime: string;
  /** 자동삭제 사전 경고/링크 안내를 받을 이메일. 없으면 조용히 삭제만 한다. */
  email?: string;
  /** confirm이 이 메타를 쓴 시각(ISO). 디버깅/감사용. */
  publishedAt: string;
  /** 삭제 7일 전 경고 메일을 이미 보냈으면 true — 스케줄러가 매일 돌아도 중복 발송하지 않는다. */
  warnedAt?: string;
}

export async function saveInvitationMeta(
  slug: string,
  data: Omit<InvitationMeta, 'publishedAt'>,
): Promise<void> {
  const dir = getStoreDir();
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const meta: InvitationMeta = { ...data, publishedAt: new Date().toISOString() };
  await fs.writeFile(filePathFor(slug), JSON.stringify(meta, null, 2), { mode: 0o600 });
}

export async function getInvitationMeta(slug: string): Promise<InvitationMeta | null> {
  try {
    const raw = await fs.readFile(filePathFor(slug), 'utf-8');
    return JSON.parse(raw) as InvitationMeta;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/** 스케줄러가 전체 슬러그를 순회할 때 쓴다. */
export async function listInvitationSlugs(): Promise<string[]> {
  try {
    const files = await fs.readdir(getStoreDir());
    return files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -'.json'.length));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

export async function markWarned(slug: string): Promise<void> {
  const meta = await getInvitationMeta(slug);
  if (!meta) return;
  await saveInvitationMeta(slug, { ...meta, warnedAt: new Date().toISOString() });
}

export async function deleteInvitationMeta(slug: string): Promise<void> {
  try {
    await fs.unlink(filePathFor(slug));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}
