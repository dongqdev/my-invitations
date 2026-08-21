/**
 * 청첩장 입력 폼의 상태 형태.
 *
 * 이후 태스크(정적 생성 파이프라인)가 이 형태를 그대로 이어받아 사용할 수 있도록 export
 * 한다. 이미지 필드는 선택 직후에는 로컬 File 객체 + blob 미리보기 URL을 담고 있다가,
 * 폼 제출(R2 업로드) 시점에 `mainImagePreviewUrl`/`GalleryImage.previewUrl`이 R2 공개
 * URL로 교체된다(InvitationForm.tsx의 handleSubmit 참고) — 이후 미리보기는 그 필드를
 * blob/공개 URL 구분 없이 그대로 렌더링한다.
 */

export interface BankAccount {
  bank: string;
  holder: string;
  accountNumber: string;
}

export interface ParentInfo {
  name: string;
  account: BankAccount;
}

export interface GalleryImage {
  id: string;
  file: File;
  previewUrl: string;
}

export type ParentKey = 'groomFather' | 'groomMother' | 'brideFather' | 'brideMother';

export interface InvitationFormData {
  mainImage: File | null;
  mainImagePreviewUrl: string | null;
  galleryImages: GalleryImage[];
  title: string;
  content: string;
  /** `<input type="datetime-local">` 값 형식 (예: "2026-11-08T12:30") */
  weddingDateTime: string;
  groomName: string;
  brideName: string;
  groomFather: ParentInfo;
  groomMother: ParentInfo;
  brideFather: ParentInfo;
  brideMother: ParentInfo;
}

export const PARENT_KEYS: ParentKey[] = [
  'groomFather',
  'groomMother',
  'brideFather',
  'brideMother',
];

export const PARENT_LABELS: Record<ParentKey, string> = {
  groomFather: '신랑측 아버지',
  groomMother: '신랑측 어머니',
  brideFather: '신부측 아버지',
  brideMother: '신부측 어머니',
};

function createEmptyParent(): ParentInfo {
  return {
    name: '',
    account: { bank: '', holder: '', accountNumber: '' },
  };
}

export function createEmptyInvitationFormData(): InvitationFormData {
  return {
    mainImage: null,
    mainImagePreviewUrl: null,
    galleryImages: [],
    title: '',
    content: '',
    weddingDateTime: '',
    groomName: '',
    brideName: '',
    groomFather: createEmptyParent(),
    groomMother: createEmptyParent(),
    brideFather: createEmptyParent(),
    brideMother: createEmptyParent(),
  };
}
