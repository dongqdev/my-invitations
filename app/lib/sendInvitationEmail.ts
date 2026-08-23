import nodemailer from 'nodemailer';

/**
 * 확정된 청첩장 링크를 이메일로 보낸다 — 사용자 요청(2026-08-23): "청첩장
 * 생성시 이메일을 받고, 링크 주소를 전달해주는건 어때?". HTML 파일 첨부는
 * 리소스 낭비라는 사용자 판단으로 빼고, 대신 "오프라인 저장은 브라우저
 * Ctrl+S로 하면 된다"는 안내를 이메일 본문에 넣는다.
 *
 * SMTP 자격증명은 `/app/.env.shared`에 이미 있던 값(blog-bot 등 다른
 * 프로젝트와 공유하는 Gmail 계정)을 그대로 재사용한다 — 이 프로젝트
 * 전용으로 새로 발급하지 않았다. 키 이름을 그 파일과 동일하게 맞춰서
 * (`SMTP_SERVER`/`SMTP_PORT`/`SENDER_EMAIL`/`SENDER_PASSWORD`) 배포 시
 * `.env.shared`의 값을 그대로 복사해 넣기만 하면 되게 했다.
 *
 * 이메일 발송 실패가 확정(git publish) 자체를 막아서는 안 된다 — 호출하는
 * 쪽(`/api/confirm`)이 이 함수를 best-effort로 취급하고 실패를 삼킨다.
 * 서버 전용 모듈이다.
 */

function getTransportConfig() {
  const host = process.env.SMTP_SERVER;
  const port = Number(process.env.SMTP_PORT ?? '587');
  const user = process.env.SENDER_EMAIL;
  const pass = process.env.SENDER_PASSWORD;
  if (!host || !user || !pass) return null;
  return { host, port, user, pass };
}

export interface InvitationEmailInput {
  to: string;
  groomName: string;
  brideName: string;
  /** 슬러그별 실제 배포 URL(테마별). main.html이 없어도 되도록 index만 필수로 받는다. */
  indexUrl: string;
  themeUrls: { main: string; developer: string; terminal: string };
}

/** 실패해도 예외를 던지지 않는다 — 호출자가 별도 try/catch 없이 결과만 확인하면 된다. */
export async function sendInvitationEmail(
  input: InvitationEmailInput,
): Promise<{ sent: boolean; reason?: string }> {
  const config = getTransportConfig();
  if (!config) return { sent: false, reason: 'SMTP 설정이 없습니다.' };

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  const subject = `${input.groomName} ❤️ ${input.brideName} 모바일 청첩장 링크`;
  const text = [
    `${input.groomName}님 · ${input.brideName}님의 모바일 청첩장이 완성됐어요.`,
    '',
    `기본 링크: ${input.indexUrl}`,
    '',
    '다른 디자인으로도 볼 수 있어요:',
    `- 메인: ${input.themeUrls.main}`,
    `- 개발자: ${input.themeUrls.developer}`,
    `- 터미널: ${input.themeUrls.terminal}`,
    '',
    '오프라인으로 저장하고 싶으시면, 링크를 열어 브라우저에서 Ctrl+S(맥은 Cmd+S)로 저장하시면 됩니다.',
  ].join('\n');

  try {
    await transporter.sendMail({
      from: config.user,
      to: input.to,
      subject,
      text,
    });
    return { sent: true };
  } catch (error) {
    console.error('청첩장 이메일 발송 실패', error);
    return { sent: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
