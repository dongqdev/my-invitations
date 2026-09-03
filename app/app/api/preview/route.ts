import { NextResponse } from 'next/server';
import { generateNerdkimInvitation } from '@/lib/nerdkim/generateInvitation';
import type { WeddingAccounts } from '@/lib/accountTypes';
import type { WeddingContacts } from '@/lib/contactTypes';

/**
 * `/create` 미리보기 화면(`InvitationPreview.tsx`)이 편집 중인 폼 데이터를 그대로
 * 넣어 실제 main.html 테마를 렌더링해 iframe에 보여주기 위한 엔드포인트.
 *
 * `/api/confirm`과 달리 아무것도 저장하지 않는다 — 슬러그도 고정값
 * (`PREVIEW_SLUG`)을 쓰고, 반환한 HTML은 그 요청의 응답으로만 존재한다. 확정
 * 전이라 예식일시가 아직 비어 있거나 형식이 안 맞을 수 있으므로(폼 검증은 마지막
 * 단계에서만 걸림) `generateNerdkimInvitation`이 파싱 못 하면 기본값으로 채워
 * 미리보기가 깨지지 않게 한다 — 이 시점의 "예식일시 파싱 실패"는 사용자 입력
 * 오류가 아니라 "아직 입력 안 함"이 정상 상태이기 때문.
 *
 * 계좌/연락처는 `generateNerdkimInvitation`의 입력에 없다(평문이 생성 파일에
 * 존재할 방법 자체를 없애는 설계, generateInvitation.ts 참고) — 실제 발행본은
 * `private.js`가 `/api/accounts/<slug>`를 fetch해서 채운다. 미리보기는 슬러그가
 * 'preview' 고정값이라 그 경로로는 아무것도 못 보여주는데(저장된 적이 없으니),
 * 사용자가 "계좌도 실제처럼 보고 싶다"고 요청해 fetch 대신 이 응답에 한 번
 * 심어서만 보여주는 우회로를 추가했다 — 어디에도 저장하지 않고 이 요청/응답
 * 안에서만 존재한다(private.js의 window.__PREVIEW_ACCOUNTS__ 분기 참고).
 */

const PREVIEW_SLUG = 'preview';
const FALLBACK_DATETIME = '2026-01-01T13:00';
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

interface PreviewRequestBody {
  title?: unknown;
  content?: unknown;
  groomName?: unknown;
  brideName?: unknown;
  weddingDateTime?: unknown;
  mainImageUrl?: unknown;
  galleryImageUrls?: unknown;
  groomFatherName?: unknown;
  groomMotherName?: unknown;
  brideFatherName?: unknown;
  brideMotherName?: unknown;
  venueName?: unknown;
  venueHall?: unknown;
  venueAddress?: unknown;
  venueFloor?: unknown;
  venueSubway?: unknown;
  venueLat?: unknown;
  venueLng?: unknown;
  venueMapZoom?: unknown;
  infoSubway?: unknown;
  infoBus?: unknown;
  infoParking?: unknown;
  infoMeal?: unknown;
  accounts?: unknown;
  contacts?: unknown;
}

function toStr(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toNum(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toStrArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isBankAccountInfo(
  value: unknown,
): value is { bank: string; holder: string; accountNumber: string } {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    isNonEmptyString(record.bank) &&
    isNonEmptyString(record.holder) &&
    isNonEmptyString(record.accountNumber)
  );
}

const ACCOUNT_CONTACT_KEYS = [
  'groom',
  'bride',
  'groomFather',
  'groomMother',
  'brideFather',
  'brideMother',
] as const;

function toAccounts(value: unknown): WeddingAccounts {
  const accounts: WeddingAccounts = {};
  if (!value || typeof value !== 'object') return accounts;
  const raw = value as Record<string, unknown>;
  ACCOUNT_CONTACT_KEYS.forEach((key) => {
    const candidate = raw[key];
    if (isBankAccountInfo(candidate)) accounts[key] = candidate;
  });
  return accounts;
}

function toContacts(value: unknown): WeddingContacts {
  const contacts: WeddingContacts = {};
  if (!value || typeof value !== 'object') return contacts;
  const raw = value as Record<string, unknown>;
  ACCOUNT_CONTACT_KEYS.forEach((key) => {
    const candidate = raw[key];
    if (isNonEmptyString(candidate)) contacts[key] = candidate;
  });
  return contacts;
}

/** JSON을 `<script>` 안에 안전하게 심는다 — `</script>`로 조기 종료되는 것을 막는다.
 * generateInvitation.ts의 embedJson과 동일 — 그쪽은 export하지 않는 내부 함수라
 * 여기 따로 둔다. */
function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PreviewRequestBody | null;
  if (!body) {
    return NextResponse.json({ error: '요청 본문을 읽을 수 없습니다.' }, { status: 400 });
  }

  const weddingDateTime = DATETIME_PATTERN.test(toStr(body.weddingDateTime))
    ? toStr(body.weddingDateTime)
    : FALLBACK_DATETIME;

  try {
    const { files } = await generateNerdkimInvitation({
      slug: PREVIEW_SLUG,
      title: toStr(body.title) || '제목을 입력해주세요',
      content: toStr(body.content),
      groomName: toStr(body.groomName) || '신랑',
      brideName: toStr(body.brideName) || '신부',
      weddingDateTime,
      mainImageUrl: toStr(body.mainImageUrl),
      galleryImageUrls: toStrArray(body.galleryImageUrls),
      groomFatherName: toStr(body.groomFatherName),
      groomMotherName: toStr(body.groomMotherName),
      brideFatherName: toStr(body.brideFatherName),
      brideMotherName: toStr(body.brideMotherName),
      venueName: toStr(body.venueName),
      venueHall: toStr(body.venueHall),
      venueAddress: toStr(body.venueAddress),
      venueFloor: toStr(body.venueFloor),
      venueSubway: toStr(body.venueSubway),
      venueLat: toNum(body.venueLat),
      venueLng: toNum(body.venueLng),
      venueMapZoom: toNum(body.venueMapZoom),
      infoSubway: toStr(body.infoSubway),
      infoBus: toStr(body.infoBus),
      infoParking: toStr(body.infoParking),
      infoMeal: toStr(body.infoMeal),
    });

    let html = files.get('main.html') ?? '';

    const accounts = toAccounts(body.accounts);
    const contacts = toContacts(body.contacts);
    if (Object.keys(accounts).length > 0 || Object.keys(contacts).length > 0) {
      html = html.replace(
        '<head>',
        `<head>\n<script>window.__PREVIEW_ACCOUNTS__=${embedJson(accounts)};window.__PREVIEW_CONTACTS__=${embedJson(contacts)};</script>`,
      );
    }

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('미리보기 생성 실패', error);
    return NextResponse.json({ error: '미리보기를 생성할 수 없습니다.' }, { status: 500 });
  }
}
