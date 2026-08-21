'use client';

import AccountSection from '../_components/AccountSection';
import type { WeddingAccounts } from '../_components/accountTypes';

/**
 * `/invite/preview`(서버 컴포넌트)에서 `AccountSection`(클라이언트 컴포넌트)에 mock
 * `fetchAccounts` 함수를 넘겨주기 위한 얇은 클라이언트 래퍼.
 *
 * 함수는 서버→클라이언트 컴포넌트 경계를 직렬화해서 건널 수 없다(Next.js RSC 제약,
 * `next build` 프리렌더 시 "Functions cannot be passed directly to Client Components"로
 * 실패). 이 파일 자체를 `'use client'`로 선언해서 mock 함수를 클라이언트 쪽에 두고,
 * `page.tsx`는 이 컴포넌트를 prop 없이 렌더링하기만 하면 경계를 건널 필요가 없다.
 *
 * `harness-8lh.4.2`의 실제 `/api/accounts/<slug>`는 별도 스토리 브랜치
 * (`story/harness-8lh`)에 있어 이 데모 라우트에서는 호출할 API 서버가 없다 — 실제
 * 배포 시엔 `AccountSection`을 `fetchAccounts` prop 없이 직접 써서 컴포넌트 기본값
 * (`/api/accounts/<slug>` 호출)을 쓰면 된다.
 */
const DEMO_ACCOUNTS: WeddingAccounts = {
  groom: { bank: '카카오뱅크', holder: '김민준', accountNumber: '3333012345678' },
  bride: { bank: '토스뱅크', holder: '이서연', accountNumber: '1000123456789' },
  groomFather: { bank: '하나은행', holder: '김철수', accountNumber: '123-456789-012' },
  groomMother: { bank: '국민은행', holder: '박영희', accountNumber: '987654-32-101112' },
  brideFather: { bank: '신한은행', holder: '이정훈', accountNumber: '110-234-567890' },
  brideMother: { bank: '우리은행', holder: '최미경', accountNumber: '1002-345-678901' },
};

async function fetchDemoAccounts(): Promise<WeddingAccounts> {
  // 실제 네트워크 왕복을 흉내 내 로딩 상태도 눈으로 확인할 수 있게 한다.
  await new Promise((resolve) => setTimeout(resolve, 400));
  return DEMO_ACCOUNTS;
}

export default function DemoAccountSection() {
  return <AccountSection slug="demo" fetchAccounts={fetchDemoAccounts} />;
}
