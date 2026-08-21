/**
 * 폼에서 고른 이미지 File 하나를 서버 라우트(`/api/upload`)로 보내 R2에 업로드하고, 공개
 * URL을 돌려받는다. 실제 R2 자격증명/업로드 로직은 서버 쪽(`app/lib/r2.ts`)에만 있다 — 이
 * 클라이언트 모듈은 그 라우트를 호출하는 얇은 래퍼일 뿐이다.
 */
export async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!response.ok) {
    throw new Error(`이미지 업로드 실패 (status ${response.status})`);
  }

  const data = (await response.json().catch(() => null)) as { url?: string } | null;
  if (!data?.url) {
    throw new Error('업로드 응답에 URL이 없습니다.');
  }
  return data.url;
}
