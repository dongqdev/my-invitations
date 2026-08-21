import {
  type InvitationFormData,
  type ParentInfo,
  type ParentKey,
  PARENT_KEYS,
  PARENT_LABELS,
} from './types';

export interface ParentFieldErrors {
  name?: string;
  bank?: string;
  holder?: string;
  accountNumber?: string;
}

export interface FieldErrors {
  mainImage?: string;
  title?: string;
  content?: string;
  weddingDateTime?: string;
  groomName?: string;
  brideName?: string;
  groomFather?: ParentFieldErrors;
  groomMother?: ParentFieldErrors;
  brideFather?: ParentFieldErrors;
  brideMother?: ParentFieldErrors;
}

/**
 * 최상위 필수 항목만 검사한다. 대표 이미지 / 제목 / 내용 / 예식 일시 /
 * 신랑·신부 성함 — 이 여섯 개는 항상 필수다. 제출 버튼 활성화 여부는
 * 이 결과만으로 결정한다(부모님 계좌 섹션은 항목 전체가 선택이므로
 * 버튼을 막지 않는다 — 아래 validateParentGroup 참고).
 */
export function validateRequiredFields(data: InvitationFormData): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.mainImage) errors.mainImage = '대표 이미지를 등록해주세요.';
  if (!data.title.trim()) errors.title = '제목을 입력해주세요.';
  if (!data.content.trim()) errors.content = '내용을 입력해주세요.';
  if (!data.weddingDateTime) errors.weddingDateTime = '예식 날짜와 시간을 선택해주세요.';
  if (!data.groomName.trim()) errors.groomName = '신랑 성함을 입력해주세요.';
  if (!data.brideName.trim()) errors.brideName = '신부 성함을 입력해주세요.';
  return errors;
}

/**
 * 부모님 성함+계좌 한 세트는 통째로 선택 항목이다(계좌를 공개하지 않는
 * 가정도 있으므로). 다만 하나라도 입력을 시작했다면 그 세트는 네 칸을
 * 전부 채워야 한다 — 반쯤 채워진 계좌 정보를 그대로 두지 않기 위함.
 */
export function validateParentGroup(parent: ParentInfo): ParentFieldErrors | undefined {
  const filled = {
    name: parent.name.trim().length > 0,
    bank: parent.account.bank.trim().length > 0,
    holder: parent.account.holder.trim().length > 0,
    accountNumber: parent.account.accountNumber.trim().length > 0,
  };
  const anyFilled = filled.name || filled.bank || filled.holder || filled.accountNumber;
  const allFilled = filled.name && filled.bank && filled.holder && filled.accountNumber;
  if (!anyFilled || allFilled) return undefined;

  const errors: ParentFieldErrors = {};
  if (!filled.name) errors.name = '성함을 입력해주세요.';
  if (!filled.bank) errors.bank = '은행을 입력해주세요.';
  if (!filled.holder) errors.holder = '예금주를 입력해주세요.';
  if (!filled.accountNumber) errors.accountNumber = '계좌번호를 입력해주세요.';
  return errors;
}

export function validateInvitationForm(data: InvitationFormData): FieldErrors {
  const errors = validateRequiredFields(data);
  for (const key of PARENT_KEYS) {
    const parentErrors = validateParentGroup(data[key]);
    if (parentErrors) errors[key] = parentErrors;
  }
  return errors;
}

export function hasAnyError(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** 제출 버튼 활성화 조건: 최상위 필수 항목만 채워지면 된다. */
export function isReadyToSubmit(data: InvitationFormData): boolean {
  return !hasAnyError(validateRequiredFields(data));
}

/** 오류 요약 패널(role="alert")에 뿌릴 사람이 읽는 문장 목록. */
export function toSummaryMessages(errors: FieldErrors): string[] {
  const messages: string[] = [];
  if (errors.mainImage) messages.push(errors.mainImage);
  if (errors.title) messages.push(errors.title);
  if (errors.content) messages.push(errors.content);
  if (errors.weddingDateTime) messages.push(errors.weddingDateTime);
  if (errors.groomName) messages.push(errors.groomName);
  if (errors.brideName) messages.push(errors.brideName);
  for (const key of PARENT_KEYS) {
    const parentErrors = errors[key as ParentKey];
    if (!parentErrors) continue;
    const missing = Object.values(parentErrors).filter(Boolean);
    if (missing.length > 0) {
      messages.push(`${PARENT_LABELS[key]} 계좌 정보를 마저 입력해주세요.`);
    }
  }
  return messages;
}
