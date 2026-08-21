import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import type { WeddingAccounts } from '@/lib/accountTypes';
import { saveAccounts } from '@/lib/accountStore';
import { getCustomDir, resolveInvitationSlug } from '@/lib/slug';
import { renderInvitationHtml } from '@/lib/renderInvitationHtml';
import { publishStaticPage } from '@/lib/gitPublish';

/**
 * 미리보기 화면의 '확정' 버튼이 호출하는 지점 — 정적 페이지 생성 파이프라인
 * (harness-8lh.5.2)과 git commit/push(harness-8lh.5.3)의 실제 구현.
 *
 * 흐름: 요청 바디 검증 → 슬러그 확정(`resolveInvitationSlug`) → 계좌 정보가 있으면
 * git 워크트리 밖에 별도 저장(`saveAccounts`) → 정적 HTML 조립(`renderInvitationHtml`)
 * → `custom/<slug>/index.html`에 씀 → `publishStaticPage`로 그 파일을 git
 * commit+push. push 대상 저장소/원격/브랜치/토큰은 전부 `lib/gitPublish.ts`가
 * 환경변수에서 읽으므로 이 라우트는 무엇을(경로/메시지) 커밋할지만 안다.
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
  /** 신랑측/신부측 부모님 계좌(4그룹). 전부 선택 — 채워진 그룹만 온다. */
  accounts?: unknown;
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
  accounts: WeddingAccounts;
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
    !isNonEmptyString(body.mainImageUrl)
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
    accounts,
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

  const html = renderInvitationHtml({
    slug,
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
  });

  const targetDir = path.join(getCustomDir(), slug);
  const relativePath = `custom/${slug}/index.html`;
  try {
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, 'index.html'), html, 'utf-8');
  } catch (error) {
    console.error('정적 페이지 파일 쓰기 실패', error);
    return NextResponse.json(
      { error: '정적 페이지 파일을 쓰는 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }

  let commitSha: string;
  try {
    const result = await publishStaticPage(relativePath, `chore(invite): publish ${slug}`);
    commitSha = result.commitSha;
  } catch (error) {
    console.error('정적 페이지 git publish 실패', error);
    return NextResponse.json(
      { error: '정적 페이지를 git에 게시하는 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ status: 'ok', slug, path: relativePath, commitSha }, { status: 200 });
}
