import { NextResponse } from 'next/server';
import { getContacts } from '@/lib/contactStore';

/**
 * 연락처 조회 API — `GET /api/contacts/<slug>`. `api/accounts/[slug]/route.ts`와
 * 완전히 같은 구조(CORS 화이트리스트, 404/500 처리) — 전화번호도 계좌와 동일하게
 * git에 없는 서버 로컬 데이터라 정적 페이지가 클라이언트에서 fetch로 읽어온다.
 */

const ALLOWED_ORIGINS = new Set([
  'https://blog.dongq.dev',
  'http://localhost:3000',
  'http://localhost:3001',
]);

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);
  const { slug } = await params;

  try {
    const contacts = await getContacts(slug);
    if (!contacts) {
      return NextResponse.json(
        { error: '해당 슬러그의 연락처 정보를 찾을 수 없습니다.' },
        { status: 404, headers },
      );
    }
    return NextResponse.json(contacts, { status: 200, headers });
  } catch (error) {
    console.error('연락처 조회 실패', error);
    return NextResponse.json(
      { error: '연락처를 조회하는 중 오류가 발생했습니다.' },
      { status: 500, headers },
    );
  }
}
