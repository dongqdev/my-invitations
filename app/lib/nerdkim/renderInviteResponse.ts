import { NextResponse } from 'next/server';
import { loadInviteConfig } from './inviteConfig';
import { generateNerdkimInvitation } from './generateInvitation';

/**
 * `/i/<slug>` 계열 Route Handler 3개(main/developer/terminal)가 공유하는 렌더링
 * 로직. `custom/<slug>/config.yaml`을 읽어 `generateNerdkimInvitation()`의 해당
 * 테마 HTML을 그대로 반환한다 — harness-a04q.1.1(M0)에서 확립한 패턴.
 */
export async function renderInviteResponse(
  slug: string,
  themeFile: 'main.html' | 'developer.html' | 'terminal.html',
): Promise<NextResponse> {
  let input;
  try {
    input = await loadInviteConfig(slug);
  } catch (error) {
    console.error('config.yaml 조회 실패', error);
    return NextResponse.json(
      { error: '청첩장 정보를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
  if (!input) {
    return NextResponse.json({ error: `청첩장을 찾을 수 없습니다: ${slug}` }, { status: 404 });
  }

  let html: string | undefined;
  try {
    const generated = await generateNerdkimInvitation(input);
    html = generated.files.get(themeFile);
  } catch (error) {
    console.error('청첩장 생성 실패', error);
    return NextResponse.json(
      { error: '청첩장을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
  if (!html) {
    return NextResponse.json(
      { error: '청첩장을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
