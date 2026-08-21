/**
 * 확정된 청첩장 정적 페이지가 실제로 공개됐는지(GitHub Pages 재빌드 완료 여부)를
 * 서버에서 확인한다(harness-8lh.5.4).
 *
 * `/api/confirm`(harness-8lh.5.2/5.3)이 `custom/<slug>/index.html`을 git
 * commit+push까지 끝내도, 그 커밋이 실제로 `https://blog.dongq.dev/my-invitations/custom/<slug>/`에서
 * 200을 반환하기까지는 GitHub Pages 재빌드 지연(보통 수십 초~1분)이 있다.
 * 브라우저에서 `blog.dongq.dev`로 직접 fetch하면 CORS에 막힐 수 있으므로(GitHub
 * Pages가 임의 오리진에 CORS를 허용한다는 보장이 없다), 이 확인은 항상 서버(API
 * 라우트)가 대신 수행한다.
 *
 * `MY_INVITATIONS_PUBLISH_BASE_URL` 환경변수로 확인 대상 base URL을 재정의할 수
 * 있다(기본값은 실제 서빙 경로 `https://blog.dongq.dev/my-invitations/custom`) —
 * 이 스토리 원칙상 실제 confirm/push 없이 검증해야 하므로, 테스트에서는 이미 존재하는
 * 다른 아카이브 경로(예: `https://blog.dongq.dev/my-invitations/wedding`)로 바꿔
 * 가리켜서 "실제로 200이 오는 경우"를 재현한다. 기본값 그대로 존재하지 않는 임의
 * 슬러그를 조회하면 자연스럽게 404 케이스가 된다.
 */

const DEFAULT_BASE_URL = 'https://blog.dongq.dev/my-invitations/custom';

function getBaseUrl(): string {
  return process.env.MY_INVITATIONS_PUBLISH_BASE_URL ?? DEFAULT_BASE_URL;
}

/** 슬러그가 가리키는 공개 청첩장 URL. 클라이언트의 링크 복사 버튼도 이 규칙을 따른다. */
export function getPublishedUrl(slug: string): string {
  return `${getBaseUrl()}/${slug}/`;
}

export interface PublishStatusResult {
  /** 해당 URL이 200(정확히는 2xx)을 반환해 실제로 열람 가능한 상태인지. */
  ready: boolean;
  /** 확인 대상 URL. */
  url: string;
  /** 원격에서 받은 HTTP 상태 코드. 네트워크 자체가 실패했으면 `null`. */
  httpStatus: number | null;
}

/**
 * `getPublishedUrl(slug)`를 GET으로 조회해 실제로 열람 가능한지 확인한다.
 *
 * HEAD 대신 GET을 쓰는 이유: 정적 호스팅 환경 전부가 HEAD를 완벽히 지원한다는
 * 보장이 없고(일부는 405를 반환), 이 확인은 폴링 주기(수 초)에 한 번씩만 일어나는
 * 가벼운 요청이라 GET의 응답 바디 비용은 무시할 수 있다. 네트워크 오류(DNS 실패,
 * 타임아웃 등) 자체는 예외로 던지지 않고 `httpStatus: null, ready: false`로
 * 정규화한다 — 호출자(API 라우트)가 이를 "아직 준비 안 됨"과 동일하게 취급해
 * 클라이언트 폴링이 계속 재시도하게 한다.
 */
export async function checkPublishStatus(slug: string): Promise<PublishStatusResult> {
  const url = getPublishedUrl(slug);
  try {
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    return { ready: response.ok, url, httpStatus: response.status };
  } catch (error) {
    console.error(`배포 상태 확인 실패 (${url})`, error);
    return { ready: false, url, httpStatus: null };
  }
}
