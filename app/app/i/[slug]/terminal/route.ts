import { renderInviteResponse } from '@/lib/nerdkim/renderInviteResponse';

/** 청첩장 서버 렌더링 — `GET /i/<slug>/terminal`. `app/app/i/[slug]/route.ts`와 동일한
 * 패턴, terminal 테마만 다르다. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderInviteResponse(slug, 'terminal.html');
}
