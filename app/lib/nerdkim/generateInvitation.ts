import { promises as fs } from 'fs';
import path from 'path';

/**
 * nerdkim/wedding-invitation-for-nerds(MIT) 정적 템플릿(main/developer/terminal)에
 * 우리 폼 데이터를 주입해 `custom/<slug>/{index,main,developer,terminal}.html`을
 * 만든다(harness-mnr.3.1).
 *
 * 원본은 `invitation.conf` + `build.sh`(bash sed 치환)로 하던 일을 그대로 Node/TS로
 * 옮긴 것이다 — 토큰 표는 `app/lib/nerdkim-templates/*.html`에 실제 등장하는
 * `{{TOKEN}}` 전체를 대상으로 한다(`grep -ho '{{[A-Z0-9_]*}}' *.html | sort -u`로 확인).
 *
 * 계좌는 이 함수의 입력에 없다 — `renderInvitationHtml.ts`와 동일한 이유(계좌
 * 평문이 파일에 존재할 방법 자체를 없앤다)로, 계좌 관련 토큰(`__GIFT__`)도 만들지
 * 않는다. 대신 `window.__ACCOUNTS_API_BASE__`/`window.__SLUG__`만 주입하고,
 * `js/private.js`(어댑터 버전)가 그 값으로 `/api/accounts/<slug>`를 fetch한다.
 */

/** `next start`/`next dev` 프로세스는 항상 `app/` 안에서 실행된다(`lib/slug.ts`의
 * `getCustomDir()`과 동일 가정) — 번들러가 `__dirname`을 그대로 보존하지 않으므로
 * (Next 서버 번들에서 합성 경로로 치환됨, 실측) `process.cwd()` 기반으로 고정한다. */
function getTemplatesDir(): string {
  return (
    process.env.MY_INVITATIONS_TEMPLATES_DIR ?? path.join(process.cwd(), 'lib', 'nerdkim-templates')
  );
}

const PAGE_BASE_URL =
  process.env.MY_INVITATIONS_PUBLISH_BASE_URL ?? 'https://blog.dongq.dev/my-invitations/custom';

function getApiBaseUrl(): string {
  return (process.env.MY_INVITATIONS_API_BASE_URL ?? '').replace(/\/$/, '');
}

export interface NerdkimInvitationInput {
  slug: string;
  title: string;
  content: string;
  groomName: string;
  brideName: string;
  /** `<input type="datetime-local">` 값 형식 ("YYYY-MM-DDTHH:mm"). 한국 예식이므로
   * 항상 KST 벽시계 시각으로 그대로 취급한다(타임존 변환 불필요) — `formatWeddingDateTime.ts`와 동일 전제. */
  weddingDateTime: string;
  mainImageUrl: string;
  galleryImageUrls: string[];
  groomFatherName: string;
  groomMotherName: string;
  brideFatherName: string;
  brideMotherName: string;
  venueName: string;
  venueHall: string;
  venueAddress: string;
  venueFloor: string;
  venueSubway: string;
  venueSubwayShort: string;
  venueLat: number;
  venueLng: number;
  venueMapZoom: number;
  infoSubway: string;
  infoBus: string;
  infoParking: string;
  infoMeal: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** JSON을 `<script>` 안에 안전하게 심는다 — `</script>`로 조기 종료되는 것을 막는다. */
function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** `\n` 리터럴을 `<br />`로 바꾼다. build.sh의 `br()`과 동일 — 태그 문자는 먼저 이스케이프한다. */
function br(value: string): string {
  return escapeHtml(value).replace(/\\n/g, '<br />');
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

function handle(name: string): string {
  return firstName(name).toLowerCase().replace(/-/g, '');
}

interface DateParts {
  y: number;
  m: number;
  d: number;
  dow: number;
  h24: number;
  mi: number;
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_EN = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

/** `formatWeddingDateTime.ts`와 동일한 전제(문자열 직접 파싱, `Date.UTC`는 요일 계산에만) */
function parseDateTimeParts(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = match;
  const y = Number(yearStr);
  const m = Number(monthStr);
  const d = Number(dayStr);
  const h24 = Number(hourStr);
  const mi = Number(minuteStr);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m, d, dow, h24, mi };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** groom/bride 한쪽의 nerdkim `person` JSON 조각. 이름 외 항목은 폼에서 안 받으므로 빈 값. */
function personJson(name: string, parentsCsv: string) {
  return {
    name,
    short: name,
    en: '',
    initial: name.charAt(0) || '',
    role: '',
    parents: parentsCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    rankKo: '',
    rank: '',
    mbti: '',
    hobby: '',
    note: '',
    photo: '',
    photoFocus: '50% 30%',
    photoZoom: 1,
  };
}

function nth(csv: string, n: number): string {
  const parts = csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[n] ?? '';
}

/** 위경도/줌이 미입력(0)이면 지도 관련 링크를 만들지 않는다 — venueLat/Lng는 0이 "미입력" 규약(harness-mnr.1.1). */
function buildMapUrls(
  venueName: string,
  lat: number,
  lng: number,
): { naver: string; kakao: string } {
  if (!lat || !lng) return { naver: '', kakao: '' };
  const label = encodeURIComponent(venueName || '예식장');
  return {
    naver: `https://map.naver.com/p/search/${label}?c=${lng},${lat},17,0,0,0,dh`,
    kakao: `https://map.kakao.com/link/map/${label},${lat},${lng}`,
  };
}

export interface GeneratedInvitation {
  /** 파일명(예: "index.html") → 파일 내용. */
  files: Map<string, string>;
}

const THEME_FILES: { file: string; ogTokenKey: string }[] = [
  { file: 'main.html', ogTokenKey: 'OG_IMAGE_MAIN' },
  { file: 'developer.html', ogTokenKey: 'OG_IMAGE_DEV' },
  { file: 'terminal.html', ogTokenKey: 'OG_IMAGE_TERMINAL' },
];

export async function generateNerdkimInvitation(
  input: NerdkimInvitationInput,
): Promise<GeneratedInvitation> {
  const parts = parseDateTimeParts(input.weddingDateTime);
  if (!parts) {
    throw new Error(`weddingDateTime을 해석할 수 없습니다: ${input.weddingDateTime}`);
  }
  const { y, m, d, dow, h24, mi } = parts;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampmKo = h24 < 12 ? '오전' : '오후';
  const dateKo = `${y}년 ${m}월 ${d}일 ${WEEKDAY_KO[dow]}요일`;
  const timeKo = mi === 0 ? `${ampmKo} ${h12}시` : `${ampmKo} ${h12}시 ${mi}분`;

  const venueAddressFull = [input.venueAddress, input.venueFloor].filter(Boolean).join(' ');
  const mapUrls = buildMapUrls(input.venueName, input.venueLat, input.venueLng);

  const groomParents = `${input.groomFatherName}, ${input.groomMotherName}`
    .replace(/^,\s*|,\s*$/g, '')
    .trim();
  const brideParents = `${input.brideFatherName}, ${input.brideMotherName}`
    .replace(/^,\s*|,\s*$/g, '')
    .trim();

  const groomParentsCsv = [input.groomFatherName, input.groomMotherName].filter(Boolean).join(',');
  const brideParentsCsv = [input.brideFatherName, input.brideMotherName].filter(Boolean).join(',');

  const host = new URL(PAGE_BASE_URL).host;

  // {{TOKEN}} 표 — HTML 3종에 실제로 등장하는 토큰 전부.
  const baseTokens: Record<string, string> = {
    GROOM_NAME: input.groomName,
    GROOM_NAME_SHORT: input.groomName,
    GROOM_NAME_EN: '',
    GROOM_ROLE: '',
    GROOM_PARENTS: groomParents,
    GROOM_PARENTS_0: nth(groomParentsCsv, 0),
    GROOM_PARENTS_1: nth(groomParentsCsv, 1),
    GROOM_RANK_KO: '',
    GROOM_RANK_EXPR: '',
    GROOM_EN_FIRST: firstName(''),
    GROOM_HANDLE: handle(''),

    BRIDE_NAME: input.brideName,
    BRIDE_NAME_SHORT: input.brideName,
    BRIDE_NAME_EN: '',
    BRIDE_ROLE: '',
    BRIDE_PARENTS: brideParents,
    BRIDE_PARENTS_0: nth(brideParentsCsv, 0),
    BRIDE_PARENTS_1: nth(brideParentsCsv, 1),
    BRIDE_RANK_KO: '',
    BRIDE_RANK_EXPR: '',
    BRIDE_EN_FIRST: firstName(''),
    BRIDE_HANDLE: handle(''),

    VENUE_NAME: input.venueName,
    VENUE_HALL: input.venueHall,
    VENUE_SUBWAY: input.venueSubway,
    VENUE_SUBWAY_SHORT: input.venueSubwayShort,
    VENUE_ADDRESS_FULL: venueAddressFull,

    MAP_NAVER_URL: mapUrls.naver,
    MAP_KAKAO_URL: mapUrls.kakao,

    WEDDING_DATE_KO: dateKo,
    WEDDING_DATETIME_KO: `${dateKo} ${timeKo}`,
    WEDDING_DATE_ISO: `${y}-${pad2(m)}-${pad2(d)}`,
    WEDDING_DATE_DOT: `${y}.${pad2(m)}.${pad2(d)}`,
    WEDDING_YEAR: String(y),
    WEDDING_YEAR_MONTH_KO: `${y}년 ${m}월`,
    WEDDING_MONTH_EN: MONTH_EN[m - 1],
    WEDDING_DAY_EN: WEEKDAY_EN[dow],
    WEDDING_TIME_EN: `${h24 < 12 ? 'AM' : 'PM'} ${h12}:${pad2(mi)}`,
    FIRST_MET_ISO: `${y}-${pad2(m)}-${pad2(d)}`,

    INFO_SUBWAY: br(input.infoSubway),
    INFO_BUS: br(input.infoBus),
    INFO_PARKING: br(input.infoParking),
    INFO_MEAL: br(input.infoMeal),

    HOST: host,
  };

  // 사람 입력이 그대로 HTML 텍스트로 들어가는 토큰은 이스케이프한다(br()이 처리한 INFO_*는 제외).
  const escapedTokens: Record<string, string> = {};
  for (const [key, value] of Object.entries(baseTokens)) {
    escapedTokens[key] = key.startsWith('INFO_') ? value : escapeHtml(value);
  }

  const weddingJson = {
    at: `${y}-${pad2(m)}-${pad2(d)}T${pad2(h24)}:${pad2(mi)}:00+09:00`,
    firstMetAt: `${y}-${pad2(m)}-${pad2(d)}T${pad2(h24)}:${pad2(mi)}:00+09:00`,
    groom: personJson(input.groomName, groomParentsCsv),
    bride: personJson(input.brideName, brideParentsCsv),
    venue: {
      name: input.venueName,
      hall: input.venueHall,
      address: input.venueAddress,
      floor: input.venueFloor,
      addressCopy: venueAddressFull,
      subway: input.venueSubway,
      subwayShort: input.venueSubwayShort,
      lat: input.venueLat,
      lng: input.venueLng,
      zoom: input.venueMapZoom || 17,
    },
    map: { naver: mapUrls.naver, kakao: mapUrls.kakao },
    photos: {
      main: input.mainImageUrl,
      mainDev: input.mainImageUrl,
      bless: input.mainImageUrl,
      gallery: input.galleryImageUrls,
      galleryPageOrder: {},
    },
  };

  const files = new Map<string, string>();

  for (const theme of THEME_FILES) {
    let html = await fs.readFile(path.join(getTemplatesDir(), theme.file), 'utf-8');

    const pageUrl = `${PAGE_BASE_URL}/${input.slug}/${theme.file}`;
    const tokens: Record<string, string> = {
      ...escapedTokens,
      PAGE_URL: pageUrl,
      OG_IMAGE_MAIN: '',
      OG_IMAGE_DEV: '',
      OG_IMAGE_TERMINAL: '',
      [theme.ogTokenKey]: input.mainImageUrl,
    };

    for (const [key, value] of Object.entries(tokens)) {
      html = html.split(`{{${key}}}`).join(value);
    }

    // css/js를 인라인해 파일 하나로 자기완결시킨다(기존 index.html 배포 관례와 동일).
    html = await inlineCss(html, theme.file);
    html = await inlineJs(html, theme.file, input.slug, weddingJson);

    // developer.js/config.js가 상대경로로 참조하는 assets(kakao.png, assets/ai/*.svg)의
    // base. 모든 테마 파일이 custom/<slug>/ 아래 같은 깊이이므로 '../_shared'로 고정된다.
    html = html.replace(
      '<head>',
      `<head>\n  <script>window.__INV__='../_shared';window.__PHOTOS__='';</script>`,
    );

    files.set(theme.file, html);
  }

  // index.html은 main.html의 사본(원본 build.sh의 DEFAULT_VERSION=main 관례와 동일).
  const mainHtml = files.get('main.html');
  if (mainHtml) files.set('index.html', mainHtml);

  return { files };
}

async function inlineCss(html: string, themeFile: string): Promise<string> {
  const cssFile = themeFile.replace('.html', '.css');
  const linkPattern = new RegExp(`<link rel="stylesheet" href="css/${cssFile}" />`);
  if (!linkPattern.test(html)) return html;
  const css = await fs.readFile(path.join(getTemplatesDir(), 'css', cssFile), 'utf-8');
  return html.replace(linkPattern, `<style>\n${css}\n</style>`);
}

async function inlineJs(
  html: string,
  themeFile: string,
  slug: string,
  weddingJson: unknown,
): Promise<string> {
  const themeJsFile = {
    'main.html': 'main.js',
    'developer.html': 'developer.js',
    'terminal.html': 'terminal.js',
  }[themeFile];
  if (!themeJsFile) return html;

  const [configJs, privateJs, themeJs] = await Promise.all([
    fs.readFile(path.join(getTemplatesDir(), 'js', 'config.js'), 'utf-8'),
    fs.readFile(path.join(getTemplatesDir(), 'js', 'private.js'), 'utf-8'),
    fs.readFile(path.join(getTemplatesDir(), 'js', themeJsFile), 'utf-8'),
  ]);

  const dataScript =
    `window.__WEDDING__=${embedJson(weddingJson)};` +
    `window.__SLUG__=${embedJson(slug)};` +
    `window.__ACCOUNTS_API_BASE__=${embedJson(getApiBaseUrl())};` +
    `window.__NO_API__=true;`;

  const scriptBlock =
    `<script>\n${dataScript}\n</script>\n` +
    `<script>\n${configJs}\n</script>\n` +
    `<script>\n${privateJs}\n</script>\n` +
    `<script>\n${themeJs}\n</script>`;

  return html.replace(
    /<script src="js\/config\.js"><\/script>\n<!--#PRIVATE#--><script src="js\/private\.js"><\/script>\n<script src="js\/[a-z]+\.js"><\/script>/,
    scriptBlock,
  );
}
