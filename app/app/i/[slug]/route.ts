import { NextResponse } from 'next/server';
import { loadInviteConfig } from '@/lib/nerdkim/inviteConfig';
import { generateNerdkimInvitation } from '@/lib/nerdkim/generateInvitation';

/**
 * 청첩장 서버 렌더링 — `GET /i/<slug>`(main 테마). `custom/<slug>/config.yaml`을
 * 매 요청마다 읽어 `generateNerdkimInvitation()`으로 만든 main.html 문자열을 그대로
 * 반환한다. 그 함수가 이미 완전한 `<head>`(title/og:*)까지 포함한 자기완결 HTML을
 * 만들어주므로 React `page.tsx`+`generateMetadata`로 새로 짤 필요가 없다(harness-a04q.1.1
 * 스파이크 결론) — 정적 파일을 커밋하는 대신 응답으로 즉시 반환할 뿐, 생성 로직 자체는
 * 기존 `/api/confirm` 파이프라인과 동일하다.
 *
 * developer/terminal 테마는 harness-a04q.2/.3(M1/M2)에서 별도 라우트로 추가한다 —
 * 이 스파이크는 main 테마 하나로 메커니즘만 검증한다.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const input = await loadInviteConfig(slug);
  if (!input) {
    return NextResponse.json({ error: `청첩장을 찾을 수 없습니다: ${slug}` }, { status: 404 });
  }

  const generated = await generateNerdkimInvitation(input);
  const html = generated.files.get('main.html');
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
