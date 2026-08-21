/**
 * 계좌 정보(신랑/신부 본인 + 혼주 4그룹) 데이터 타입.
 *
 * 원래 `app/lib/accountStore.ts`(서버 전용, `fs` 사용)와
 * `app/app/invite/_components/accountTypes.ts`(클라이언트 컴포넌트용 복제본) 두 곳에
 * 중복 정의돼 있었다(reviewer 지적, harness-8lh.5.1 note 참고) — 서버 전용 모듈을
 * 클라이언트 컴포넌트에서 import할 수 없다는 이유로 타입만 복제해 뒀던 것인데, 타입
 * 정의 자체는 `fs` 등 서버 전용 코드가 전혀 없는 순수 타입이라 애초에 분리할 필요가
 * 없었다. 이 파일 하나로 합치고, `accountStore.ts`(서버)와
 * `AccountSection.tsx`(클라이언트) 양쪽이 이 파일을 import한다.
 */

export interface BankAccountInfo {
  bank: string;
  holder: string;
  accountNumber: string;
}

export type ParentAccountKey = 'groomFather' | 'groomMother' | 'brideFather' | 'brideMother';

/**
 * 슬러그(신랑_신부이름) 하나에 대한 계좌 정보 묶음. 신랑/신부 본인 계좌와 혼주 4그룹
 * 전부 선택 항목이다 — 공개하지 않기로 한 항목은 필드째 생략(undefined)한다.
 */
export interface WeddingAccounts {
  /** 신랑 본인 계좌 */
  groom?: BankAccountInfo;
  /** 신부 본인 계좌 */
  bride?: BankAccountInfo;
  groomFather?: BankAccountInfo;
  groomMother?: BankAccountInfo;
  brideFather?: BankAccountInfo;
  brideMother?: BankAccountInfo;
}
