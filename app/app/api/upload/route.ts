import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';

/**
 * `/create` 폼에서 첨부한 대표/갤러리 이미지를 R2에 업로드하는 엔드포인트.
 *
 * 클라이언트(InvitationForm.tsx)가 폼 제출 시점에 각 이미지를 FormData(필드명 "file")로
 * 이 라우트에 하나씩 보내고, 서버가 R2에 PUT한 뒤 공개 URL을 돌려준다 — R2 자격증명은 서버
 * 프로세스 안에만 머문다.
 */
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: '요청 본문을 읽을 수 없습니다.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file 필드가 필요합니다.' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: '빈 파일은 업로드할 수 없습니다.' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: '파일이 너무 큽니다 (최대 20MB).' }, { status: 400 });
  }

  // 오브젝트 키: <prefix>/<uuid>/<원본파일명>. 한글 등 비ASCII 파일명도 키 자체에는 그대로
  // 들어간다(R2가 UTF-8을 받아준다) — 공개 URL을 만들 때만 세그먼트별로 인코딩한다(uploadToR2).
  const prefix = (process.env.R2_OBJECT_PREFIX || 'my-invitations').replace(/\/$/, '');
  const key = `${prefix}/${randomUUID()}/${file.name}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToR2(buffer, key, file.type || 'application/octet-stream');
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error('R2 업로드 실패', error);
    return NextResponse.json({ error: '이미지 업로드에 실패했습니다.' }, { status: 500 });
  }
}
