import { NextResponse } from 'next/server';
import type { WeddingAccounts } from '@/lib/accountTypes';
import { saveAccounts } from '@/lib/accountStore';
import type { WeddingContacts } from '@/lib/contactTypes';
import { saveContacts } from '@/lib/contactStore';
import { resolveInvitationSlug } from '@/lib/slug';
import type { InviteConfig } from '@/lib/nerdkim/inviteConfig';
import { saveInviteConfig } from '@/lib/nerdkim/inviteConfig';
import { saveInvitationMeta } from '@/lib/invitationMeta';
import { sendInvitationEmail } from '@/lib/sendInvitationEmail';

/**
 * 미리보기 화면의 '확정' 버튼이 호출하는 지점.
 *
 * 흐름: 요청 바디 검증 → 슬러그 확정(`resolveInvitationSlug`) → 계좌/연락처/청첩장
 * 데이터를 전부 서버 로컬에 저장(`saveAccounts`/`saveContacts`/`saveInviteConfig`).
 * 셋 다 같은 저장소 패턴이라 git에는 전혀 안 들어간다 — 계좌/연락처만 git 밖에
 * 두던 것을 청첩장 데이터까지 통일했다(git에는 코드만 남는다). `/i/<slug>`가 이
 * 데이터를 요청마다 읽어 서버 렌더링하므로, 여기서는 완성 HTML을 만들지 않는다.
 */

interface ConfirmRequestBody {
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
  /** 확정되면 링크를 받을 이메일. 선택 — 없으면 발송 안 함. */
  email?: unknown;
  /** 신랑/신부 본인 + 신랑측/신부측 부모님 계좌(최대 6그룹). 전부 선택 — 채워진 그룹만 온다. */
  accounts?: unknown;
  /** 신랑/신부 본인 + 신랑측/신부측 부모님 연락처(최대 6명). 전부 선택. */
  contacts?: unknown;
}

interface ValidatedConfirmData {
  title: string;
  content: string;
  groomName: string;
  brideName: string;
  weddingDateTime: string;
  mainImageUrl: string;
  galleryImageUrls: string[];
  groomFatherName: string;
  groomMotherName: string;
  brideFatherName: string;
  brideMotherName: string;
  venueName: string;
  venueHall: string;
  venueAddress: string;
  venueFloor: string;
  venueSubway: string;
  venueLat: number;
  venueLng: number;
  venueMapZoom: number;
  infoSubway: string;
  infoBus: string;
  infoParking: string;
  infoMeal: string;
  /** 형식 검증만 하고 존재 여부 확인은 안 한다 — 발송 실패는 confirm 자체를 막지 않는다. */
  email: string;
  accounts: WeddingAccounts;
  contacts: WeddingContacts;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toStr(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toNum(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
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

/**
 * 요청 바디를 검증한다. 필수 항목(대표 이미지/제목/내용/예식일시/신랑·신부 성함)이
 * 하나라도 빠지면 `null`을 반환해 400으로 응답한다 — 이 검증은
 * `app/create/validation.ts`의 `validateRequiredFields`와 같은 필수 항목 집합을
 * 서버에서 한 번 더 확인하는 것이다(클라이언트 검증은 우회될 수 있으므로).
 */
function validateBody(body: ConfirmRequestBody): ValidatedConfirmData | null {
  if (
    !isNonEmptyString(body.title) ||
    !isNonEmptyString(body.content) ||
    !isNonEmptyString(body.groomName) ||
    !isNonEmptyString(body.brideName) ||
    !isNonEmptyString(body.weddingDateTime) ||
    !isNonEmptyString(body.mainImageUrl) ||
    !isNonEmptyString(body.venueName) ||
    !isNonEmptyString(body.venueAddress)
  ) {
    return null;
  }

  const galleryImageUrls = isStringArray(body.galleryImageUrls) ? body.galleryImageUrls : [];

  const accounts: WeddingAccounts = {};
  if (body.accounts && typeof body.accounts === 'object') {
    const rawAccounts = body.accounts as Record<string, unknown>;
    (
      ['groom', 'bride', 'groomFather', 'groomMother', 'brideFather', 'brideMother'] as const
    ).forEach((key) => {
      const candidate = rawAccounts[key];
      if (isBankAccountInfo(candidate)) accounts[key] = candidate;
    });
  }

  const contacts: WeddingContacts = {};
  if (body.contacts && typeof body.contacts === 'object') {
    const rawContacts = body.contacts as Record<string, unknown>;
    (
      ['groom', 'bride', 'groomFather', 'groomMother', 'brideFather', 'brideMother'] as const
    ).forEach((key) => {
      const candidate = rawContacts[key];
      if (isNonEmptyString(candidate)) contacts[key] = candidate;
    });
  }

  return {
    title: body.title,
    content: body.content,
    groomName: body.groomName,
    brideName: body.brideName,
    weddingDateTime: body.weddingDateTime,
    mainImageUrl: body.mainImageUrl,
    galleryImageUrls,
    groomFatherName: typeof body.groomFatherName === 'string' ? body.groomFatherName : '',
    groomMotherName: typeof body.groomMotherName === 'string' ? body.groomMotherName : '',
    brideFatherName: typeof body.brideFatherName === 'string' ? body.brideFatherName : '',
    brideMotherName: typeof body.brideMotherName === 'string' ? body.brideMotherName : '',
    venueName: body.venueName,
    venueHall: toStr(body.venueHall),
    venueAddress: body.venueAddress,
    venueFloor: toStr(body.venueFloor),
    venueSubway: toStr(body.venueSubway),
    venueLat: toNum(body.venueLat),
    venueLng: toNum(body.venueLng),
    venueMapZoom: toNum(body.venueMapZoom),
    email:
      typeof body.email === 'string' && EMAIL_PATTERN.test(body.email.trim())
        ? body.email.trim()
        : '',
    infoSubway: toStr(body.infoSubway),
    infoBus: toStr(body.infoBus),
    infoParking: toStr(body.infoParking),
    infoMeal: toStr(body.infoMeal),
    accounts,
    contacts,
  };
}

export async function POST(request: Request) {
  const rawBody = (await request.json().catch(() => null)) as ConfirmRequestBody | null;
  if (!rawBody) {
    return NextResponse.json({ error: '요청 본문을 읽을 수 없습니다.' }, { status: 400 });
  }

  const data = validateBody(rawBody);
  if (!data) {
    return NextResponse.json(
      { error: '필수 항목(대표 이미지, 제목, 내용, 예식 일시, 신랑/신부 성함)이 누락되었습니다.' },
      { status: 400 },
    );
  }

  let slug: string;
  try {
    slug = await resolveInvitationSlug(data.groomName, data.brideName);
  } catch (error) {
    console.error('슬러그 생성 실패', error);
    return NextResponse.json({ error: '슬러그를 생성할 수 없습니다.' }, { status: 400 });
  }

  if (Object.keys(data.accounts).length > 0) {
    await saveAccounts(slug, data.accounts);
  }

  if (Object.keys(data.contacts).length > 0) {
    await saveContacts(slug, data.contacts);
  }

  // 완성 HTML을 만들어 커밋하지 않는다 — 이 데이터 하나가 청첩장의 유일한
  // 소스이고, `/i/<slug>`가 요청마다 이걸 읽어 렌더링한다.
  const config: InviteConfig = {
    title: data.title,
    content: data.content,
    groomName: data.groomName,
    brideName: data.brideName,
    weddingDateTime: data.weddingDateTime,
    mainImageUrl: data.mainImageUrl,
    galleryImageUrls: data.galleryImageUrls,
    groomFatherName: data.groomFatherName,
    groomMotherName: data.groomMotherName,
    brideFatherName: data.brideFatherName,
    brideMotherName: data.brideMotherName,
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
  };

  try {
    await saveInviteConfig(slug, config);
  } catch (error) {
    console.error('청첩장 데이터 저장 실패', error);
    return NextResponse.json(
      { error: '청첩장 데이터를 저장하는 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }

  // 자동삭제 스케줄러가 참고할 예식일시(+이메일)를 남긴다. 실패해도 확정
  // 자체는 이미 끝났으므로 응답을 막지 않는다 — best-effort.
  try {
    await saveInvitationMeta(slug, {
      weddingDateTime: data.weddingDateTime,
      email: data.email || undefined,
    });
  } catch (error) {
    console.error('청첩장 메타(예식일시/이메일) 저장 실패', error);
  }

  if (data.email) {
    // harness-a04q.4.2부터 청첩장은 GitHub Pages 정적 파일이 아니라 이 앱 자신이
    // `/i/<slug>`(harness-a04q.1~.3)로 서버 렌더링한다 — MY_INVITATIONS_API_BASE_URL과
    // 같은 오리진(invite.dongq.dev)이므로 그대로 재사용한다(빈 값이면 상대 경로가
    // 되어 이메일 안에서는 못 여는 링크가 되므로, 개발 편의용 fallback만 붙인다).
    const siteBaseUrl = process.env.MY_INVITATIONS_API_BASE_URL || 'http://localhost:3000';
    void sendInvitationEmail({
      to: data.email,
      groomName: data.groomName,
      brideName: data.brideName,
      indexUrl: `${siteBaseUrl}/i/${slug}`,
      themeUrls: {
        main: `${siteBaseUrl}/i/${slug}`,
        developer: `${siteBaseUrl}/i/${slug}/developer`,
        terminal: `${siteBaseUrl}/i/${slug}/terminal`,
      },
    }).catch((error) => console.error('청첩장 이메일 발송 실패(무시)', error));
  }

  return NextResponse.json({ status: 'ok', slug }, { status: 200 });
}
