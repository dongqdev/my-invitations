/**
 * 청첩장 입력 폼의 상태 형태.
 *
 * 이후 태스크(미리보기, R2 업로드, 정적 생성 파이프라인)가 이 형태를 그대로
 * 이어받아 사용할 수 있도록 export 한다. 이미지 필드는 이 태스크(입력 폼 UI)
 * 범위에서는 로컬 File 객체 + 미리보기 URL로만 다루고, 실제 업로드는 다루지 않는다.
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
