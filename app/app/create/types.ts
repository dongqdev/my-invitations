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

export type ParentKey =
  'groomOwn' | 'brideOwn' | 'groomFather' | 'groomMother' | 'brideFather' | 'brideMother';

/** `@/lib/contactTypes`의 `ContactKey`와 동일한 키 집합(그쪽은 서버 전용 모듈이라
 * 클라이언트 폼에서 바로 import할 수 없어 여기 따로 둔다 — 값은 항상 같이 맞춘다). */
export type PhoneKey =
  'groom' | 'bride' | 'groomFather' | 'groomMother' | 'brideFather' | 'brideMother';

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
  groomOwn: ParentInfo;
  brideOwn: ParentInfo;
  groomFather: ParentInfo;
  groomMother: ParentInfo;
  brideFather: ParentInfo;
  brideMother: ParentInfo;
  /** 예식장 이름 (예: "그랜드 컨벤션센터") */
  venueName: string;
  /** 예식장 내 홀 이름 (예: "3층 그랜드홀") */
  venueHall: string;
  venueAddress: string;
  /** 층 안내 (예: "지하 1층 주차, 3층 예식") */
  venueFloor: string;
  /** 지하철 안내. 청첩장 상단 요약과 지도 근처 축약 표시에 같이 쓰인다(예전엔
   * 두 칸으로 나뉘어 있었는데, 사용자 요청으로 하나로 합쳤다 — 짧게 적는 걸 권장). */
  venueSubway: string;
  venueLat: number;
  venueLng: number;
  /** 지도 초기 확대 레벨 */
  venueMapZoom: number;
  /** 오시는 길 안내 문구. textarea의 실제 개행 문자를 `generateInvitation.ts`의 `br()`이 `<br />`로 바꾼다. */
  infoSubway: string;
  infoBus: string;
  infoParking: string;
  infoMeal: string;
  /** 연락처(전화번호). 계좌와 마찬가지로 전부 선택이며 git에 들어가지 않는다(`contactStore.ts`). */
  phones: Record<PhoneKey, string>;
}

export const PARENT_KEYS: ParentKey[] = [
  'groomOwn',
  'brideOwn',
  'groomFather',
  'groomMother',
  'brideFather',
  'brideMother',
];

export const PARENT_LABELS: Record<ParentKey, string> = {
  groomOwn: '신랑 본인',
  brideOwn: '신부 본인',
  groomFather: '신랑측 아버지',
  groomMother: '신랑측 어머니',
  brideFather: '신부측 아버지',
  brideMother: '신부측 어머니',
};

export const PHONE_KEYS: PhoneKey[] = [
  'groom',
  'bride',
  'groomFather',
  'groomMother',
  'brideFather',
  'brideMother',
];

export const PHONE_LABELS: Record<PhoneKey, string> = {
  groom: '신랑 본인',
  bride: '신부 본인',
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
    groomOwn: createEmptyParent(),
    brideOwn: createEmptyParent(),
    groomFather: createEmptyParent(),
    groomMother: createEmptyParent(),
    brideFather: createEmptyParent(),
    brideMother: createEmptyParent(),
    venueName: '',
    venueHall: '',
    venueAddress: '',
    venueFloor: '',
    venueSubway: '',
    venueLat: 0,
    venueLng: 0,
    venueMapZoom: 0,
    phones: {
      groom: '',
      bride: '',
      groomFather: '',
      groomMother: '',
      brideFather: '',
      brideMother: '',
    },
    infoSubway: '',
    infoBus: '',
    infoParking: '',
    infoMeal: '',
  };
}
