import { NextResponse } from 'next/server';
import { getAccounts } from '@/lib/accountStore';

/**
 * 계좌 정보 조회 API — `GET /api/accounts/<slug>`.
 *
 * 확정된 청첩장은 GitHub Pages(`blog.dongq.dev`)의 정적 HTML로 서빙되고, 계좌 데이터는
 * git에 들어가지 않는다(`app/lib/accountStore.ts` 참고). 그 정적 페이지가 클라이언트에서
 * fetch로 이 API를 호출해 계좌 정보를 읽어온다 — 정적 페이지 오리진(`blog.dongq.dev`)과
 * 이 API 서버의 오리진(추후 `invite.dongq.dev`, harness-ixv에서 배포 예정)이 다르므로
 * CORS를 명시적으로 허용해야 한다. 계좌정보 API라 와일드카드(`*`) 대신 허용 오리진을
 * 화이트리스트로 관리한다.
 */

const ALLOWED_ORIGINS = new Set([
  'https://blog.dongq.dev',
  // 로컬 개발 편의 — 정적 페이지를 로컬에서 띄워 이 API를 호출해볼 때 필요.
  'http://localhost:3000',
  'http://localhost:3001',
]);

/**
 * 요청 오리진에 대한 CORS 응답 헤더를 만든다. 허용 목록에 없는 오리진(또는 Origin
 * 헤더 자체가 없는 요청)이면 `Access-Control-Allow-Origin`을 넣지 않는다 — CORS는
 * 브라우저가 강제하는 것이므로, 서버는 어차피 응답은 정상적으로 돌려주고 브라우저가
 * 그 헤더 유무로 스크립트에 노출할지 말지를 판단한다.
 */
function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // 오리진별로 다른 Allow-Origin 값을 내려주므로 캐시가 오리진을 키로 구분하게 한다.
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/** 브라우저 preflight 요청 처리. */
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);
  const { slug } = await params;

  try {
    const accounts = await getAccounts(slug);
    if (!accounts) {
      return NextResponse.json(
        { error: '해당 슬러그의 계좌 정보를 찾을 수 없습니다.' },
        { status: 404, headers },
      );
    }
    return NextResponse.json(accounts, { status: 200, headers });
  } catch (error) {
    console.error('계좌 정보 조회 실패', error);
    return NextResponse.json(
      { error: '계좌 정보를 조회하는 중 오류가 발생했습니다.' },
      { status: 500, headers },
    );
  }
}
