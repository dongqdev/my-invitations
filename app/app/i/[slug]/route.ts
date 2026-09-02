import { renderInviteResponse } from '@/lib/nerdkim/renderInviteResponse';

/**
 * 청첩장 서버 렌더링 — `GET /i/<slug>`(main 테마, 기본). `custom/<slug>/config.yaml`을
 * 매 요청마다 읽어 `generateNerdkimInvitation()`으로 만든 main.html 문자열을 그대로
 * 반환한다 — 렌더링 로직은 `renderInviteResponse()`(developer/terminal 테마와 공유).
 * 그 함수가 이미 완전한 `<head>`(title/og:*)까지 포함한 자기완결 HTML을 만들어주므로
 * React `page.tsx`+`generateMetadata`로 새로 짤 필요가 없다(harness-a04q.1.1 스파이크 결론).
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderInviteResponse(slug, 'main.html');
}
