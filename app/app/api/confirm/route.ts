import { NextResponse } from 'next/server';

/**
 * 미리보기 화면의 '확정' 버튼이 호출하는 지점 — M5(정적 페이지 생성 + R2
 * 업로드 + 배포) 파이프라인의 진입점이다.
 *
 * M5가 아직 구현되지 않았으므로 지금은 요청을 받았다는 것만 확인하고
 * 스텁 응답을 돌려준다. 실제 파이프라인은 M5 완료 후 이 핸들러 안에서
 * 구현한다 — 호출하는 쪽(InvitationPreview.tsx)은 이미 이 엔드포인트를
 * 호출하도록 연결돼 있으므로 여기만 채우면 된다.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  // TODO(M5): 여기서 실제 정적 페이지 생성 + R2 업로드 + 배포 파이프라인을 트리거한다.
  console.info('[stub] /api/confirm 호출됨 (M5 파이프라인 미구현)', body);

  return NextResponse.json({ status: 'stub', message: 'M5 파이프라인 연동 예정' }, { status: 202 });
}
