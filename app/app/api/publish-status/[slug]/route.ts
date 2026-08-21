import { NextResponse } from 'next/server';
import { checkPublishStatus } from '@/lib/publishStatus';

/**
 * 배포 상태 확인 API — `GET /api/publish-status/<slug>`.
 *
 * `/api/confirm`(harness-8lh.5.2/5.3)이 git commit+push까지 끝낸 뒤에도
 * GitHub Pages 재빌드가 끝나 실제로 `https://blog.dongq.dev/my-invitations/custom/<slug>/`가
 * 200을 반환하기까지는 지연이 있다(harness-8lh.5.4). 미리보기 화면
 * (`InvitationPreview.tsx`)이 확정 직후 이 라우트를 주기적으로 폴링해 로딩
 * 상태를 유지하다가, `ready: true`가 오면 링크 복사 버튼을 노출한다.
 *
 * 브라우저가 `blog.dongq.dev`로 직접 fetch하면 CORS에 막힐 수 있어(GitHub
 * Pages가 임의 오리진에 CORS 허용을 보장하지 않음), 실제 확인은 이 서버가
 * 대신 수행하고 클라이언트는 이 API(같은 오리진)만 폴링한다.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'slug가 없습니다.' }, { status: 400 });
  }

  const result = await checkPublishStatus(slug);
  return NextResponse.json(result, { status: 200 });
}
