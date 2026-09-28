#!/usr/bin/env node
/**
 * 예식일로부터 30일이 지난 청첩장을 자동으로 지운다(사용자 요청,
 * 2026-08-23). 매일 한 번 systemd timer/cron으로 돌리는 것을 전제로 만든
 * 독립 스크립트다 — Next.js 프로세스 밖에서 실행되므로 `lib/`의 서버 전용
 * 모듈(fs 기반)을 그대로 import하지 않고 같은 저장 경로 규약만 그대로
 * 따른다(`lib/invitationMeta.ts`, `lib/accountStore.ts`, `lib/contactStore.ts`,
 * `lib/nerdkim/inviteConfig.ts` 참고 — 네 파일과 저장 경로/환경변수 이름을
 * 반드시 맞춰 유지할 것).
 *
 * 흐름:
 *   1. /root/.my-invitations-meta/*.json 전부를 읽는다(슬러그별 예식일시+이메일).
 *   2. 예식일시 + 30일이 지났으면: 메타·계좌·연락처·청첩장 데이터 파일(4곳,
 *      각 슬러그별 로컬 JSON 저장소)을 전부 삭제한다.
 *   3. 아직 안 지났지만 7일 이내로 다가왔고 이메일이 있고 아직 경고를 안
 *      보냈으면: 경고 메일을 보내고 메타에 warnedAt을 남긴다.
 *
 * 실행: `node scripts/cleanupExpiredInvitations.mjs`. my-invitations.service와
 * 같은 .env를 공유해 SMTP_ 관련 값과 MY_INVITATIONS_*_DIR을 읽는다.
 *
 * 2026-09-29 수정: 청첩장 데이터가 git(`custom/<slug>/config.yaml`, harness-a04q
 * 시절)에서 서버 로컬 저장소(`lib/nerdkim/inviteConfig.ts`, accountStore.ts와
 * 동일 패턴)로 옮겨간 뒤에도 이 스크립트는 옛날 git rm 방식 그대로였다 — 그래서
 * targetDir이 항상 없어 "already gone" 스킵만 찍고 실제 삭제는 전혀 안 되고 있었다
 * (30일 후 자동삭제 기능이 사실상 무력화된 상태였음, 만료 경고 메일의 잘못된 링크와
 * 함께 발견). git 관련 로직을 전부 걷어내고 로컬 파일 삭제로 교체함.
 */

import { promises as fs } from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const META_DIR = process.env.MY_INVITATIONS_META_DIR ?? '/root/.my-invitations-meta';
const ACCOUNTS_DIR = process.env.MY_INVITATIONS_ACCOUNTS_DIR ?? '/root/.my-invitations-accounts';
const CONTACTS_DIR = process.env.MY_INVITATIONS_CONTACTS_DIR ?? '/root/.my-invitations-contacts';
const CONFIGS_DIR = process.env.MY_INVITATIONS_CONFIGS_DIR ?? '/root/.my-invitations-configs';
// harness-a04q.4.2부터 청첩장은 `/i/<slug>`로 이 앱 자신이 서버 렌더링한다(app/api/confirm/route.ts와
// 동일 로직) — 예전 GitHub Pages 정적 경로(blog.dongq.dev/my-invitations/custom/<slug>/)는
// 더 이상 존재하지 않는다. MY_INVITATIONS_PUBLISH_BASE_URL이라는 별도 변수를 쓰지 말고
// MY_INVITATIONS_API_BASE_URL을 그대로 재사용한다(2026-09-29 수정 — 잘못된 링크가 담긴
// 만료 경고 메일이 실제로 나간 사고 발견).
const SITE_BASE_URL = (process.env.MY_INVITATIONS_API_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

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

async function deleteSlug(slug) {
  const files = [
    path.join(CONFIGS_DIR, `${slug}.json`),
    path.join(ACCOUNTS_DIR, `${slug}.json`),
    path.join(CONTACTS_DIR, `${slug}.json`),
    path.join(META_DIR, `${slug}.json`),
  ];
  let deletedAny = false;
  for (const file of files) {
    const removed = await fs
      .unlink(file)
      .then(() => true)
      .catch((err) => {
        if (err.code !== 'ENOENT') throw err;
        return false;
      });
    deletedAny = deletedAny || removed;
  }
  log(deletedAny ? `deleted expired invitation: ${slug}` : `skip delete: ${slug} already gone`);
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
        `현재 청첩장(${SITE_BASE_URL}/i/${slug})이 ${daysLeft}일 후 자동으로 삭제될 예정입니다.`,
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
