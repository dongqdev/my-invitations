/**
 * 계좌 아코디언(`AccountSection`)이 다루는 데이터 타입.
 *
 * `harness-8lh.4.2`가 만든 서버 전용 저장소(`app/lib/accountStore.ts`, 별도 스토리
 * 브랜치 `story/harness-8lh`에 있고 이 브랜치에는 아직 병합되지 않았다)의
 * `BankAccountInfo`/`WeddingAccounts`와 **필드 구조를 동일하게** 유지한다 — 뷰어가
 * `GET /api/accounts/<slug>` 응답을 그대로 이 타입으로 읽는다.
 *
 * 서버 모듈을 직접 import하지 않고 뷰어 쪽에 타입을 복제해 둔 이유: 저 모듈은 Node
 * `fs`를 쓰는 서버 전용 코드라 클라이언트 컴포넌트(`AccountSection`, `'use client'`)에서
 * import하면 안 되고, 애초에 이 스토리 브랜치에는 그 파일 자체가 없다(별도 스토리에서
 * 작업 중). 두 타입이 어긋나면 `/api/accounts/<slug>` 응답을 파싱하는 지점에서 타입
 * 에러로 드러난다.
 */
export interface BankAccountInfo {
  bank: string;
  holder: string;
  accountNumber: string;
}

/** 신랑/신부 본인 계좌 + 혼주(양가 부모) 계좌. 전부 선택 항목 — 없으면 필드 자체가 없다. */
export interface WeddingAccounts {
  groom?: BankAccountInfo;
  bride?: BankAccountInfo;
  groomFather?: BankAccountInfo;
  groomMother?: BankAccountInfo;
  brideFather?: BankAccountInfo;
  brideMother?: BankAccountInfo;
}
