import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * dongq-storage-10 버킷을 여러 앱이 공유해서 쓰는 구조다(blog-bot, trend-cardnews 등과 동일
 * 계정/버킷). 새 Cloudflare 리소스를 발급하지 않고, 앱별로 오브젝트 키 프리픽스만 나눠서 경로
 * 충돌을 막는다 — 이 앱은 R2_OBJECT_PREFIX(my-invitations). `/app/DEVELOPMENT.md`
 * "파일/이미지 저장소" 절 참고. 서버 전용 모듈이다(클라이언트 컴포넌트에서 import 금지 — R2
 * 자격증명이 번들에 포함되면 안 된다).
 */
function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  });
}

/**
 * 버퍼를 R2에 업로드하고 공개 URL을 반환한다.
 *
 * S3/R2 오브젝트 키 자체는 UTF-8(한글 등 비ASCII 파일명 포함)을 그대로 받아준다 — 문제는 그
 * 키로 공개 URL을 만들 때다. 한글 파일명을 그대로 이어붙이면 외부 크롤러가 못 가져오는 문제를
 * 이미 두 번 겪었다(`/app/DEVELOPMENT.md` "파일/이미지 저장소" 절). "/"는 경로 구분자라
 * 인코딩하면 안 되므로 세그먼트별로 encodeURIComponent 한다.
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBase = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
  if (!bucket || !publicBase) {
    throw new Error('R2_BUCKET_NAME / R2_PUBLIC_URL 환경변수가 필요합니다.');
  }

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }),
  );

  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${publicBase}/${encodedKey}`;
}
