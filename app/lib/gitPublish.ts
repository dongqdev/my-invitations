import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * 확정된 정적 청첩장 페이지(`custom/<slug>/index.html`)를 git에 commit하고
 * 원격에 push한다(harness-8lh.5.3). `/api/confirm`(harness-8lh.5.2)이 파일을
 * 워킹카피에 쓴 직후 이 모듈을 호출한다.
 *
 * 이 모듈이 대상으로 하는 git 저장소는 **이 Next.js 앱이 돌아가는 워킹카피와
 * 다를 수 있다** — 개발/harness 워크트리에서는 이 워크트리 자체를 쓰지만,
 * 실제 프로덕션 배포에서는 배포 서버의 전용 "게시용 클론"을 가리켜야 한다
 * (harness-ixv에서 실제 배치/PAT 설정). 그래서 저장소 경로/원격 이름/브랜치를
 * 전부 환경변수로 주입 가능하게 하고, 이 워크트리를 가리키는 기본값은 개발
 * 편의를 위한 것일 뿐 프로덕션 동작을 가정하지 않는다.
 *
 * - `GIT_PUBLISH_REPO_PATH`: git 명령을 실행할 저장소 경로. 기본값은 현재
 *   워킹카피의 저장소 루트(`app/`의 부모 디렉터리) — `lib/slug.ts`의
 *   `getCustomDir()`과 동일한 가정(Next.js 프로세스는 항상 `app/` 안에서
 *   실행된다)을 따른다.
 * - `GIT_PUBLISH_REMOTE`: 기본값 `origin`.
 * - `GIT_PUBLISH_BRANCH`: 기본값 `main`.
 * - `GIT_PUBLISH_TOKEN`(또는 `GITHUB_TOKEN`): push 인증용 토큰. 설정돼 있으면
 *   push하는 그 순간에만 `https://<token>@host/...` 형태로 remote URL에
 *   인라인해서 쓰고, git 설정(`.git/config`)에는 절대 저장하지 않는다(URL을
 *   직접 push 인자로 넘기지, `git remote set-url`로 영구 반영하지 않는다).
 *   설정하지 않았다면(로컬 file:// 스크래치 원격처럼 인증이 필요 없는 경우)
 *   토큰 없이 그대로 push한다 — 토큰 값 자체는 이 파일 어디에도 하드코딩돼
 *   있지 않고 항상 환경변수에서만 읽는다.
 *
 * 서버 전용 모듈이다(Node `child_process`를 쓴다 — 클라이언트 컴포넌트에서
 * import 금지).
 */

export interface PublishResult {
  /** 실제로 새 커밋을 만들었는지. false면 이미 동일한 내용이 커밋돼 있어 스킵했다는 뜻. */
  committed: boolean;
  /** push된(혹은 이미 그 상태였던) HEAD 커밋 SHA. */
  commitSha: string;
}

function getRepoPath(): string {
  return process.env.GIT_PUBLISH_REPO_PATH ?? path.join(process.cwd(), '..');
}

function getRemoteName(): string {
  return process.env.GIT_PUBLISH_REMOTE ?? 'origin';
}

function getBranch(): string {
  return process.env.GIT_PUBLISH_BRANCH ?? 'main';
}

function getToken(): string | undefined {
  return process.env.GIT_PUBLISH_TOKEN || process.env.GITHUB_TOKEN || undefined;
}

/**
 * `text`에서 실제 토큰 값(있으면)과, `https://<자격증명>@host/...` 형태의 URL
 * 어디서든 자격증명 부분을 마스킹한다. 토큰 리터럴 치환과 URL 패턴 치환을
 * 둘 다 거는 이유: (1) push URL에 인라인된 토큰은 리터럴 치환으로 확실히
 * 잡히고, (2) git이 에러 메시지에서 URL을 재구성하거나 우리가 모르는 다른
 * 경로로 자격증명이 섞여 들어오는 경우까지 URL 패턴 치환이 방어망 역할을
 * 한다.
 */
function maskSecrets(text: string, token: string | undefined): string {
  let masked = text;
  if (token) {
    masked = masked.split(token).join('***');
  }
  masked = masked.replace(/https:\/\/[^\s@/]+@/g, 'https://***@');
  return masked;
}

type ExecFileError = Error & {
  cmd?: string;
  stdout?: string;
  stderr?: string;
  code?: number | string;
  killed?: boolean;
  signal?: string | null;
};

/**
 * execFile 실패 시 던져지는 에러(`.message`/`.cmd`/`.stdout`/`.stderr`/`.stack`
 * 전부)에서 토큰이 인라인된 push URL이 그대로 노출되지 않도록, 마스킹된
 * 값들로 채운 새 Error를 만들어 반환한다. 호출자는 원본 대신 이 에러를
 * 던져야 한다 — 그래야 `/api/confirm`의 `console.error`가 로깅해도 서버
 * 로그에 실제 PAT이 남지 않는다.
 */
function maskTokenInError(error: unknown, token: string | undefined): Error {
  if (!(error instanceof Error)) {
    return new Error(maskSecrets(String(error), token));
  }
  const rich = error as ExecFileError;
  const masked = new Error(maskSecrets(error.message, token)) as ExecFileError;
  masked.name = error.name;
  masked.stack = error.stack ? maskSecrets(error.stack, token) : error.stack;
  if (typeof rich.cmd === 'string') masked.cmd = maskSecrets(rich.cmd, token);
  if (typeof rich.stdout === 'string') masked.stdout = maskSecrets(rich.stdout, token);
  if (typeof rich.stderr === 'string') masked.stderr = maskSecrets(rich.stderr, token);
  if (rich.code !== undefined) masked.code = rich.code;
  if (rich.killed !== undefined) masked.killed = rich.killed;
  if (rich.signal !== undefined) masked.signal = rich.signal;
  return masked;
}

async function git(repoPath: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', repoPath, ...args]);
    return stdout.trim();
  } catch (error) {
    // push 인자에 토큰 인라인 URL이 들어갈 수 있으므로(withInlineToken), 모든
    // git 호출 실패를 여기서 일괄 마스킹한다 — 어느 하위 명령이 실패하든
    // 호출자에게는 항상 토큰이 제거된 에러만 전파된다.
    throw maskTokenInError(error, getToken());
  }
}

/**
 * 토큰이 있으면 https remote URL에 인라인해서 반환한다(git 설정 파일에는 안
 * 남는다 — 호출자가 이 반환값을 `git push`의 URL 인자로만 쓰기 때문). URL이
 * https가 아니거나(ssh, file:// 등) 토큰이 없으면, 혹은 URL에 이미 자격증명이
 * 박혀 있으면 원본을 그대로 반환한다.
 */
function withInlineToken(remoteUrl: string, token: string | undefined): string {
  if (!token) return remoteUrl;
  if (!remoteUrl.startsWith('https://')) return remoteUrl;
  const rest = remoteUrl.slice('https://'.length);
  if (rest.includes('@')) return remoteUrl;
  return `https://${token}@${rest}`;
}

/**
 * `relativePath`(저장소 루트 기준 경로, 예:
 * `custom/hong-gil-dong_kim-yeong-hee/index.html`)를 git add + commit +
 * push한다. add 이후 스테이징된 변경이 없으면(이미 동일 내용으로 커밋돼
 * 있으면) 커밋은 건너뛰고 현재 HEAD SHA를 그대로 push 대상으로 삼는다(멱등
 * 재호출 대비 — 예: 재시도로 같은 slug가 다시 들어오는 경우).
 *
 * 실패(네트워크, 인증, non-fast-forward 등)하면 예외를 던진다 — 호출자
 * (`/api/confirm`)가 이를 잡아 응답에 반영한다. 재시도 큐 등은 이 함수의
 * 책임이 아니다.
 */
export async function publishStaticPage(
  relativePath: string,
  commitMessage: string,
): Promise<PublishResult> {
  const repoPath = getRepoPath();
  const remoteName = getRemoteName();
  const branch = getBranch();
  const token = getToken();

  await git(repoPath, ['add', '--', relativePath]);

  const staged = await git(repoPath, ['diff', '--cached', '--name-only']);
  let committed = false;
  if (staged.length > 0) {
    await git(repoPath, ['commit', '-m', commitMessage]);
    committed = true;
  }

  const commitSha = await git(repoPath, ['rev-parse', 'HEAD']);

  const remoteUrl = await git(repoPath, ['remote', 'get-url', remoteName]);
  const pushUrl = withInlineToken(remoteUrl, token);

  await git(repoPath, ['push', pushUrl, `HEAD:${branch}`]);

  return { committed, commitSha };
}
