import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { getCustomDir } from '../slug';
import type { NerdkimInvitationInput } from './generateInvitation';

/**
 * `custom/<slug>/config.yaml` 스키마 — `generateNerdkimInvitation()`이 받는
 * `NerdkimInvitationInput`과 완전히 같은 필드다(slug는 파일 경로 자체가 슬러그이므로
 * 제외). 발행 파이프라인(`/api/confirm`)이 지금은 완성 HTML을 커밋하지만, 이
 * 스토리(harness-a04q) 완료 후에는 이 yaml 하나만 커밋하게 된다.
 */
export type InviteConfig = Omit<NerdkimInvitationInput, 'slug'>;

/**
 * `custom/<slug>/config.yaml`을 읽어 `NerdkimInvitationInput`으로 반환한다.
 * 파일이 없으면 null을 반환한다(호출자가 404로 대응할 수 있게 — throw하지 않는다).
 */
export async function loadInviteConfig(slug: string): Promise<NerdkimInvitationInput | null> {
  const filePath = path.join(getCustomDir(), slug, 'config.yaml');
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  const config = parseYaml(raw) as InviteConfig;
  return { ...config, slug };
}
