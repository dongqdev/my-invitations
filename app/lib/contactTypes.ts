/**
 * 연락처(전화번호) 데이터 타입. `accountTypes.ts`와 같은 이유로 서버 전용 모듈
 * (`contactStore.ts`, `fs` 사용)과 클라이언트 컴포넌트 양쪽에서 쓸 수 있게 순수
 * 타입만 이 파일에 둔다.
 */

export type ContactKey =
  'groom' | 'bride' | 'groomFather' | 'groomMother' | 'brideFather' | 'brideMother';

/**
 * 슬러그(신랑_신부이름) 하나에 대한 연락처 묶음. 신랑/신부 본인과 혼주 4명 전부
 * 선택 항목이다 — 공개하지 않기로 한 사람은 필드째 생략(undefined)한다.
 */
export type WeddingContacts = Partial<Record<ContactKey, string>>;
