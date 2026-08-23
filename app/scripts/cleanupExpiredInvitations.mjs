#!/usr/bin/env node
/**
 * 예식일로부터 30일이 지난 청첩장을 자동으로 지운다(사용자 요청,
 * 2026-08-23). 매일 한 번 systemd timer/cron으로 돌리는 것을 전제로 만든
 * 독립 스크립트다 — Next.js 프로세스 밖에서 실행되므로 `lib/`의 서버 전용
 * 모듈(fs 기반)을 그대로 import하지 않고 같은 저장 경로 규약만 그대로
 * 따른다(`lib/invitationMeta.ts`, `lib/accountStore.ts`, `lib/gitPublish.ts`
 * 참고 — 세 파일과 저장 경로/환경변수 이름을 반드시 맞춰 유지할 것).
 *
 * 흐름:
 *   1. /root/.my-invitations-meta/*.json 전부를 읽는다(슬러그별 예식일시+이메일).
 *   2. 예식일시 + 30일이 지났으면: git rm -r custom/<slug> → commit → push,
 *      메타 파일과 계좌 파일도 삭제한다.
 *   3. 아직 안 지났지만 7일 이내로 다가왔고 이메일이 있고 아직 경고를 안
 *      보냈으면: 경고 메일을 보내고 메타에 warnedAt을 남긴다.
 *
 * 실행: `node scripts/cleanupExpiredInvitations.mjs` (cwd는 app/ 이어야
 * GIT_PUBLISH_REPO_PATH 기본값 `path.join(cwd, '..')`이 실제 레포를 가리킨다.
 * my-invitations.service와 같은 .env를 공유해 SMTP_ 관련 값과 GIT_PUBLISH_TOKEN을 읽는다.)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import nodemailer from 'nodemailer';

const execFileAsync = promisify(execFile);

const META_DIR = process.env.MY_INVITATIONS_META_DIR ?? '/root/.my-invitations-meta';
const ACCOUNTS_DIR = process.env.MY_INVITATIONS_ACCOUNTS_DIR ?? '/root/.my-invitations-accounts';
const REPO_PATH = process.env.GIT_PUBLISH_REPO_PATH ?? path.join(process.cwd(), '..');
const REMOTE = process.env.GIT_PUBLISH_REMOTE ?? 'origin';
const BRANCH = process.env.GIT_PUBLISH_BRANCH ?? 'main';
const TOKEN = process.env.GIT_PUBLISH_TOKEN || process.env.GITHUB_TOKEN || undefined;
const PAGE_BASE_URL =
  process.env.MY_INVITATIONS_PUBLISH_BASE_URL ?? 'https://blog.dongq.dev/my-invitations/custom';

const EXPIRE_AFTER_DAYS = 30;
const WARN_BEFORE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

/** weddingDateTime("YYYY-MM-DDTHH:mm", KST 벽시계 시각)을 만료 판정용 절대
 * 시각으로 바꾼다. generateInvitation.ts의 parseDateTimeParts와 같은 전제 —
 * KST를 그대로 UTC+9로 고정한다(한국 예식이므로 타임존 변환이 굳이 필요없다). */
function weddingDateToInstant(weddingDateTime) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(weddingDateTime);
  if (!match) return null;
  const [, y, m, d, h, mi] = match;
  return new Date(`${y}-${m}-${d}T${h}:${mi}:00+09:00`);
}

async function git(args) {
  const { stdout } = await execFileAsync('git', ['-C', REPO_PATH, ...args]);
  return stdout.trim();
}

function withInlineToken(remoteUrl) {
  if (!TOKEN) return remoteUrl;
  try {
    const url = new URL(remoteUrl);
    url.username = TOKEN;
    return url.toString();
  } catch {
    return remoteUrl;
  }
}

async function deleteSlug(slug) {
  const relativePath = `custom/${slug}`;
  const targetDir = path.join(REPO_PATH, relativePath);
  const exists = await fs
    .access(targetDir)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    log(`skip delete: ${relativePath} already gone from working tree`);
  } else {
    await git(['rm', '-r', '--', relativePath]);
    await git(['commit', '-m', `chore(invite): auto-delete expired ${slug}`]);
    const remoteUrl = await git(['remote', 'get-url', REMOTE]);
    await git(['push', withInlineToken(remoteUrl), `HEAD:${BRANCH}`]);
    log(`deleted expired invitation: ${slug}`);
  }

  await fs.unlink(path.join(META_DIR, `${slug}.json`)).catch(() => {});
  await fs.unlink(path.join(ACCOUNTS_DIR, `${slug}.json`)).catch(() => {});
}

function getTransport() {
  const host = process.env.SMTP_SERVER;
  const port = Number(process.env.SMTP_PORT ?? '587');
  const user = process.env.SENDER_EMAIL;
  const pass = process.env.SENDER_PASSWORD;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

async function sendWarningEmail(slug, meta, daysLeft) {
  const transport = getTransport();
  if (!transport || !meta.email) return false;
  try {
    await transport.sendMail({
      from: process.env.SENDER_EMAIL,
      to: meta.email,
      subject: `청첩장 링크가 ${daysLeft}일 후 삭제될 예정이에요`,
      text: [
        `안녕하세요, 예식을 마치신 두 분께 안내드려요.`,
        '',
        `현재 청첩장(${PAGE_BASE_URL}/${slug}/)이 ${daysLeft}일 후 자동으로 삭제될 예정입니다.`,
        '보관하고 싶은 내용이 있으시면, 링크를 열어 브라우저에서 Ctrl+S(맥은 Cmd+S)로 미리 저장해두세요.',
      ].join('\n'),
    });
    return true;
  } catch (error) {
    log(`warning email failed for ${slug}:`, error.message);
    return false;
  }
}

async function markWarned(slug, meta) {
  await fs.writeFile(
    path.join(META_DIR, `${slug}.json`),
    JSON.stringify({ ...meta, warnedAt: new Date().toISOString() }, null, 2),
    { mode: 0o600 },
  );
}

async function main() {
  let files;
  try {
    files = (await fs.readdir(META_DIR)).filter((f) => f.endsWith('.json'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      log('no meta dir yet, nothing to do');
      return;
    }
    throw err;
  }

  const now = new Date();
  let deleted = 0;
  let warned = 0;

  for (const file of files) {
    const slug = file.slice(0, -'.json'.length);
    const raw = await fs.readFile(path.join(META_DIR, file), 'utf-8');
    const meta = JSON.parse(raw);
    const weddingAt = weddingDateToInstant(meta.weddingDateTime);
    if (!weddingAt) {
      log(`skip ${slug}: unparseable weddingDateTime ${meta.weddingDateTime}`);
      continue;
    }

    const expireAt = new Date(weddingAt.getTime() + EXPIRE_AFTER_DAYS * DAY_MS);
    const warnAt = new Date(expireAt.getTime() - WARN_BEFORE_DAYS * DAY_MS);

    if (now >= expireAt) {
      await deleteSlug(slug);
      deleted += 1;
      continue;
    }

    if (now >= warnAt && !meta.warnedAt) {
      const daysLeft = Math.max(0, Math.ceil((expireAt.getTime() - now.getTime()) / DAY_MS));
      const sent = await sendWarningEmail(slug, meta, daysLeft);
      if (sent) {
        await markWarned(slug, meta);
        warned += 1;
        log(`sent expiry warning for ${slug} (${daysLeft} days left)`);
      }
    }
  }

  log(`done. checked=${files.length} deleted=${deleted} warned=${warned}`);
}

main().catch((error) => {
  console.error('cleanupExpiredInvitations failed:', error);
  process.exitCode = 1;
});
