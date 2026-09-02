import { convert as romanizeHangul } from 'hangul-romanization';
import { inviteConfigExists } from './nerdkim/inviteConfig';

/**
 * 확정된 청첩장의 URL 슬러그(`/i/<슬러그>` 경로이자 청첩장 데이터 저장소의 키)를
 * 만들고, 이미 존재하는 슬러그와 충돌했을 때 사용 가능한 이름을 찾는다.
 *
 * 신랑/신부 성함은 거의 항상 한글이다(`InvitationFormData.groomName`/`brideName`).
 * 레포의 기존 아카이브 폴더명(`wedding/choijaehoon` 등)이 전부 로마자 표기라는
 * 관례를 따라, 한글 이름은 `hangul-romanization`(Revised Romanization, 의존성
 * 없는 순수 함수 하나짜리 라이브러리)으로 로마자화한 뒤 슬러그에 넣는다. 이미
 * 영문/숫자로만 된 이름은 그대로(소문자화만) 쓴다 — 완벽한 표준 표기보다
 * "충돌 없이 안정적으로 재현 가능한 URL"이 이 태스크의 목적이라 라이브러리
 * 정확도 이슈(예: 음운 규칙 예외)는 감수한다.
 */

const HANGUL_RE = /[가-힣]/;

/**
 * 사람 이름 한 조각(신랑 또는 신부)을 슬러그에 쓸 수 있는 소문자
 * 영문/숫자/하이픈 문자열로 변환한다. 한글이 섞여 있으면 먼저 로마자로
 * 바꾼 뒤, 로마자화되지 않는 문자(공백, 특수문자 등)는 하이픈으로 접어
 * URL-safe하게 만든다.
 */
function slugifyNameSegment(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';

  const romanized = HANGUL_RE.test(trimmed) ? romanizeHangul(trimmed) : trimmed;

  return romanized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // 로마자 발음부호(accent) 제거
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * '신랑성함_신부성함' 형태의 슬러그를 만든다. 이름 자체는 하이픈으로 접고,
 * 신랑/신부 구분자만 언더스코어를 쓴다 — 세그먼트 내부 하이픈과 구분자가
 * 섞여도(`hong-gil-dong_kim-yeong-hee`) 어디서 신랑/신부가 나뉘는지 항상
 * 명확하도록.
 *
 * 이름에서 영문/숫자/한글이 하나도 못 건져지면(빈 문자열, 특수문자만 등)
 * 슬러그를 만들 수 없으므로 에러를 던진다 — 폼에서 두 이름 모두 필수
 * 항목이므로 정상 흐름에서는 발생하지 않아야 한다.
 */
export function generateSlug(groomName: string, brideName: string): string {
  const groomSlug = slugifyNameSegment(groomName);
  const brideSlug = slugifyNameSegment(brideName);

  if (!groomSlug || !brideSlug) {
    throw new Error(
      `신랑/신부 이름으로 슬러그를 생성할 수 없습니다 (groomName=${JSON.stringify(groomName)}, brideName=${JSON.stringify(brideName)})`,
    );
  }

  return `${groomSlug}_${brideSlug}`;
}

/** 후보 슬러그가 이미 쓰이고 있는지 확인하는 함수. 동기/비동기 둘 다 허용한다. */
export type SlugExistsCheck = (slug: string) => boolean | Promise<boolean>;

/**
 * `baseSlug`가 비어있으면 그대로, 이미 쓰이고 있으면 `-2`, `-3`, ... 접미사를
 * 붙여가며 사용 가능한 첫 슬러그를 찾아 반환한다.
 *
 * 충돌 여부 확인 자체는 호출자가 주는 `checkExists`에 위임한다 — 이 함수는
 * 파일시스템/DB 등 실제 저장소를 모른다(테스트하기 쉽게, 그리고 저장소가
 * 나중에 바뀌어도 이 로직은 그대로 재사용 가능하게 하기 위함).
 */
export async function resolveSlug(baseSlug: string, checkExists: SlugExistsCheck): Promise<string> {
  if (!(await checkExists(baseSlug))) {
    return baseSlug;
  }

  let suffix = 2;
  while (true) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!(await checkExists(candidate))) {
      return candidate;
    }
    suffix += 1;
  }
}

/**
 * 신랑/신부 성함으로부터, 청첩장 데이터 저장소(`lib/nerdkim/inviteConfig.ts`,
 * harness-a04q 이후 서버 로컬) 안에서 실제로 사용 가능한(충돌 없는) 최종 슬러그를
 * 만든다. `generateSlug` + `resolveSlug` + `inviteConfigExists`를 묶은 편의 함수 —
 * 확정 파이프라인(`/api/confirm`)이 이 함수 하나만 호출하면 되게 하기 위함.
 */
export async function resolveInvitationSlug(groomName: string, brideName: string): Promise<string> {
  const baseSlug = generateSlug(groomName, brideName);
  return resolveSlug(baseSlug, inviteConfigExists);
}
