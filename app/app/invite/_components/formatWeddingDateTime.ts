const WEEKDAY_LABELS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export interface FormattedWeddingDateTime {
  /** 예: "2026년 8월 1일 토요일" */
  dateLabel: string;
  /** 예: "오후 12시 30분" (정각이면 "오후 12시") */
  timeLabel: string;
  /** `<time dateTime>` 속성용 ISO 형식 (초 단위까지 채움) */
  isoDateTime: string;
}

/**
 * `datetime-local` 형식 문자열("YYYY-MM-DDTHH:mm")을 한국어 초대장 문구로 바꾼다.
 *
 * 의도적으로 `new Date(value)` + `Intl.DateTimeFormat`을 쓰지 않는다 — 타임존 없는
 * 문자열을 `Date`로 파싱하면 실행 환경의 로컬 타임존으로 해석되어, 서버(SSR)와
 * 하객의 브라우저(CSR)가 서로 다른 타임존이면 하이드레이션 불일치가 나고, 무엇보다
 * 예식 시각은 "적힌 그대로"가 정답이지 보는 사람 타임존에 따라 달라지면 안 된다.
 * 그래서 문자열을 직접 파싱하고, 요일 계산에만 (UTC 고정이라 타임존에 안전한)
 * `Date.UTC`를 보조로 쓴다.
 */
export function formatWeddingDateTime(value: string): FormattedWeddingDateTime | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const weekday = WEEKDAY_LABELS[weekdayIndex];

  const ampm = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const timeLabel = minute === 0 ? `${ampm} ${hour12}시` : `${ampm} ${hour12}시 ${minute}분`;

  return {
    dateLabel: `${year}년 ${month}월 ${day}일 ${weekday}`,
    timeLabel,
    isoDateTime: `${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minuteStr}:00`,
  };
}
