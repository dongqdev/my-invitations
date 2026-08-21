import type { InvitationViewData } from './types';
import styles from './InviteMessage.module.css';

export type InviteMessageProps = Pick<InvitationViewData, 'title' | 'content'>;

/**
 * 초대 문구 섹션 — 짧은 제목 아래 본문(하객에게 전하는 인사말)을 차분한 톤으로 보여준다.
 *
 * 본문은 하객이 폼에서 입력한 줄바꿈을 그대로 보존해야 한다. plain text의 `\n`은 HTML에서
 * 기본적으로 무시되므로, 줄 단위로 split 해서 각 줄을 `<p>`로 렌더링한다(마크다운 등 추가
 * 파싱은 하지 않음 — 순수 줄바꿈 보존만 담당).
 */
export default function InviteMessage({ title, content }: InviteMessageProps) {
  const lines = content.split('\n');

  return (
    <section className={styles.section} aria-label="초대 문구">
      {title && <p className={styles.title}>{title}</p>}
      <div className={styles.body}>
        {lines.map((line, index) => (
          // 본문은 사용자가 직접 입력한 자유 텍스트라 줄 내용만으로 안정적인 key를 만들 수
          // 없다 — 목록이 재정렬되지 않는 정적 렌더링이므로 index를 key로 써도 안전하다.
          <p key={index} className={styles.line}>
            {line || ' '}
          </p>
        ))}
      </div>
    </section>
  );
}
