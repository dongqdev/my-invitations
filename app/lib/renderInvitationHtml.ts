import { formatWeddingDateTime } from '../app/invite/_components/formatWeddingDateTime';

/**
 * `custom/<slug>/index.html`로 쓰일 완전히 독립적인 정적 HTML을 문자열로 조립한다.
 *
 * 설계 결정(harness-8lh.5.2): `app/app/invite/_components/*.tsx`(Hero/InviteMessage/
 * ParentsSection/Gallery/AccountSection/BottomBar, harness-0i2가 만든 뷰어 컴포넌트)를
 * 그대로 서버 렌더링해서 재사용하지 않는다. 그 컴포넌트들은 CSS Modules(`*.module.css`)를
 * 쓰는데, 클래스명 해시는 Next 빌드 파이프라인 안에서만 일어난다 — `next build` 밖에서
 * (이 정적 페이지는 GitHub Pages로 서빙되고 Next 런타임이 전혀 없다) 그 해시를 재현하려면
 * CSS Modules 로더를 직접 흉내 내야 해서 배보다 배꼽이 크다. 대신:
 *   - 마크업은 각 컴포넌트의 JSX 구조를 그대로 옮겨 적되(문자열 템플릿),
 *   - 스타일은 각 `*.module.css` 소스의 규칙을 그대로 가져와 클래스명만 (해시 없는)
 *     새 이름으로 바꿔 하나의 `<style>`로 합치고,
 *   - 인터랙션(계좌 아코디언의 fetch+펼치기, 갤러리 라이트박스, 링크 복사 토스트)은
 *     React 없이 순수 vanilla JS로 다시 짠다.
 * React/Next 런타임을 정적 페이지에 통째로 실어 보내는 건 이 규모에 과하다는 판단.
 *
 * 계좌 데이터는 이 함수의 입력에 아예 없다 — 계좌번호가 파일 내용에 존재하지 않는다는
 * acceptance를 코드 형태로 보장하기 위해, 애초에 이 함수의 시그니처에 계좌 필드를
 * 두지 않았다(실수로 넣을 방법 자체가 없게).  계좌는 `AccountSection`과 동일하게
 * 버튼 클릭 시 `/api/accounts/<slug>`를 fetch해서만 얻는다.
 */

export interface RenderInvitationHtmlInput {
  /** URL 슬러그. 계좌 조회 API(`/api/accounts/<slug>`) 호출과 `<title>`에 쓰인다. */
  slug: string;
  title: string;
  content: string;
  groomName: string;
  brideName: string;
  /** `<input type="datetime-local">` 값 형식. `Hero`와 동일하게 문자열 그대로 파싱한다. */
  weddingDateTime: string;
  /** R2 공개 URL. */
  mainImageUrl: string;
  /** R2 공개 URL 목록. 빈 배열이면 갤러리 섹션 자체를 생략한다(`Gallery`와 동일). */
  galleryImageUrls: string[];
  groomFatherName: string;
  groomMotherName: string;
  brideFatherName: string;
  brideMotherName: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `href`/`src` 속성용 이스케이프. `"` 만 막으면 되지만 일관성을 위해 `escapeHtml`을 그대로 쓴다. */
const escapeAttr = escapeHtml;

const CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-body), 'Apple SD Gothic Neo', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.page-scope {
  --color-bg: #fbf7f0;
  --color-surface: #ffffff;
  --color-ink: #2b2a26;
  --color-ink-soft: #6b6558;
  --color-ink-faint: #8f8878;
  --color-gold: #b98b4e;
  --color-border: #e6ddc9;
  --color-border-strong: #d5c9ac;
  --font-display: 'Nanum Myeongjo', serif;
  --font-body: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
}
.page {
  max-width: 480px;
  min-height: 100vh;
  margin: 0 auto;
  padding-top: 32px;
  padding-bottom: 96px;
  background: var(--color-bg);
}

/* ---------- Hero ---------- */
.hero { display: flex; flex-direction: column; }
.hero-image-frame {
  position: relative;
  margin: 0 28px;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: 3px;
  background: var(--color-border);
  outline: 1px solid rgba(0, 0, 0, 0.1);
  outline-offset: -1px;
}
.hero-image { display: block; width: 100%; height: 100%; object-fit: cover; }
.hero-divider { width: 56px; height: 1px; margin: 28px 28px 0; background: var(--color-border-strong); }
.hero-details { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 20px 28px 40px; }
.hero-date-block { min-width: 0; }
.hero-date-time { display: flex; flex-direction: column; gap: 6px; font-family: var(--font-body); }
.hero-date-line { font-size: 14px; line-height: 1.5; color: var(--color-ink-soft); letter-spacing: 0.01em; }
.hero-time-line { font-size: 14px; line-height: 1.5; font-weight: 600; color: var(--color-ink); letter-spacing: 0.01em; }
.hero-names { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; margin: 0; text-align: right; flex-shrink: 0; }
.hero-name {
  font-family: var(--font-display);
  font-size: clamp(22px, 6.5vw, 28px);
  font-weight: 800;
  line-height: 1.2;
  color: var(--color-ink);
  letter-spacing: 0.32em;
  margin-right: -0.32em;
  display: block;
}

/* ---------- InviteMessage ---------- */
.invite-message { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 48px 32px 56px; text-align: center; }
.invite-message-title { margin: 0; font-family: var(--font-display); font-size: 17px; font-weight: 700; line-height: 1.6; color: var(--color-ink); letter-spacing: 0.02em; }
.invite-message-body { display: flex; flex-direction: column; max-width: 320px; margin: 0 auto; }
.invite-message-line { margin: 0; font-family: var(--font-body); font-size: 15px; font-weight: 400; line-height: 1.9; color: var(--color-ink-soft); letter-spacing: 0.01em; }

/* ---------- ParentsSection ---------- */
.parents { padding: 40px 32px 56px; border-top: 1px solid var(--color-border); }
.parents-columns { display: grid; grid-template-columns: 1fr auto 1fr; align-items: stretch; gap: 20px; }
.parents-column { display: flex; flex-direction: column; align-items: center; gap: 20px; min-width: 0; }
.parents-column-title { margin: 0; font-family: var(--font-body); font-size: 13px; font-weight: 600; letter-spacing: 0.12em; color: var(--color-gold); }
.parents-divider { width: 1px; align-self: stretch; background: var(--color-border-strong); }
.parents-rows { display: flex; flex-direction: column; gap: 14px; margin: 0; width: 100%; padding: 0; list-style: none; }
.parents-row { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.parents-role { margin: 0; font-family: var(--font-body); font-size: 12px; font-weight: 400; color: var(--color-ink-faint); letter-spacing: 0.04em; }
.parents-name { margin: 0; font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--color-ink); letter-spacing: 0.04em; }

/* ---------- Gallery ---------- */
.gallery { padding: 40px 32px 56px; border-top: 1px solid var(--color-border); }
.gallery-label { margin: 0 0 20px; font-family: var(--font-body); font-size: 13px; font-weight: 600; letter-spacing: 0.28em; color: var(--color-gold); text-align: center; }
.gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.gallery-thumb-btn { display: block; padding: 0; border: 0; margin: 0; background: var(--color-border); cursor: pointer; aspect-ratio: 1 / 1; overflow: hidden; }
.gallery-thumb-btn:focus-visible { outline: 2px solid var(--color-gold); outline-offset: -2px; }
.gallery-thumb-img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 200ms ease-out; }
.gallery-thumb-btn:hover .gallery-thumb-img, .gallery-thumb-btn:focus-visible .gallery-thumb-img { transform: scale(1.04); }
.gallery-overlay { position: fixed; inset: 0; z-index: 100; display: none; align-items: center; justify-content: center; padding: 24px; background: rgba(0, 0, 0, 0.88); }
.gallery-overlay[data-open='true'] { display: flex; }
.gallery-close-btn { position: absolute; top: 20px; right: 20px; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; border: 0; border-radius: 50%; background: rgba(255, 255, 255, 0.12); color: #fbf7f0; cursor: pointer; }
.gallery-close-btn:hover, .gallery-close-btn:focus-visible { background: rgba(255, 255, 255, 0.22); }
.gallery-expanded-img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; cursor: default; }

/* ---------- AccountSection ---------- */
.account { padding: 40px 32px 56px; border-top: 1px solid var(--color-border); }
.account-label { margin: 0 0 8px; font-family: var(--font-body); font-size: 13px; font-weight: 600; letter-spacing: 0.28em; color: var(--color-gold); text-align: center; }
.account-hint { margin: 0 0 20px; font-size: 13px; color: var(--color-ink-faint); text-align: center; }
.account-button-row { display: flex; flex-direction: column; gap: 10px; }
.account-toggle-btn {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; min-height: 52px; padding: 14px 18px;
  border: 1px solid var(--color-border-strong); border-radius: 12px;
  background: var(--color-surface); color: var(--color-ink);
  font-family: var(--font-body); font-size: 15px; font-weight: 600; letter-spacing: 0.01em;
  cursor: pointer;
  transition: border-color 160ms ease-out, background-color 160ms ease-out, transform 120ms ease-out;
}
.account-toggle-btn:hover { border-color: var(--color-gold); }
.account-toggle-btn:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 2px; }
.account-toggle-btn:active { transform: scale(0.98); }
.account-toggle-btn[aria-expanded='true'] { border-color: var(--color-gold); background: var(--color-bg); }
.account-chevron { flex: none; color: var(--color-gold); transition: transform 220ms cubic-bezier(0.23, 1, 0.32, 1); }
.account-toggle-btn[aria-expanded='true'] .account-chevron { transform: rotate(180deg); }
.account-panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 240ms cubic-bezier(0.23, 1, 0.32, 1); }
.account-panel[data-open='true'] { grid-template-rows: 1fr; }
.account-panel-inner { overflow: hidden; min-height: 0; }
.account-panel-content { padding-top: 12px; }
.account-panel:not([data-open='true']) .account-panel-content { padding-top: 0; }
.account-status, .account-status-error { margin: 0; padding: 14px 4px; font-size: 14px; color: var(--color-ink-soft); }
.account-status-error { color: #b3413c; }
.account-list { display: flex; flex-direction: column; gap: 10px; list-style: none; margin: 0 0 12px; padding: 0; }
.account-card { padding: 16px 18px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-bg); }
.account-card-label { margin: 0 0 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; color: var(--color-ink-faint); text-transform: uppercase; }
.account-card-bank { margin: 0 0 2px; font-size: 14px; color: var(--color-ink-soft); }
.account-number-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 4px; }
.account-number { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: 0.01em; font-variant-numeric: tabular-nums; }
.account-holder { margin: 0; font-size: 13px; color: var(--color-ink-soft); }
.account-copy-btn {
  flex: none; min-height: 30px; padding: 6px 12px;
  border: 1px solid var(--color-border-strong); border-radius: 8px;
  background: var(--color-surface); color: var(--color-gold);
  font-family: var(--font-body); font-size: 12px; font-weight: 600; letter-spacing: 0.01em;
  cursor: pointer;
  transition: border-color 160ms ease-out, background-color 160ms ease-out, transform 120ms ease-out;
}
.account-copy-btn:hover { border-color: var(--color-gold); }
.account-copy-btn:active { transform: scale(0.96); }
.account-copy-toast {
  display: block; min-height: 15px; margin-top: 4px; font-size: 12px; font-weight: 600; color: var(--color-gold);
  opacity: 0; transform: translateY(-2px); transition: opacity 180ms ease-out, transform 180ms ease-out;
}
.account-copy-toast[data-visible='true'] { opacity: 1; transform: translateY(0); }

/* ---------- BottomBar ---------- */
.bottom-bar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
  display: flex; justify-content: center;
  border-top: 1px solid var(--color-border); background: var(--color-surface);
  padding: 12px max(20px, env(safe-area-inset-left)) calc(12px + env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-right));
}
.bottom-bar-inner { position: relative; width: 100%; max-width: 480px; }
.bottom-bar-copy-btn {
  width: 100%; min-height: 52px; border: 0; border-radius: 12px;
  background: var(--color-gold); color: #fff;
  font-family: var(--font-body); font-size: 15px; font-weight: 700; letter-spacing: 0.01em;
  cursor: pointer;
  transition: filter 160ms ease-out, transform 120ms ease-out;
}
.bottom-bar-copy-btn:hover { filter: brightness(1.06); }
.bottom-bar-copy-btn:active { transform: scale(0.98); }
.bottom-bar-toast {
  position: absolute; left: 50%; bottom: calc(100% + 10px);
  display: block; padding: 6px 14px; border-radius: 999px;
  background: var(--color-ink); color: var(--color-bg);
  font-size: 13px; font-weight: 600; white-space: nowrap; pointer-events: none;
  transform: translate(-50%, 4px); opacity: 0;
  transition: opacity 180ms ease-out, transform 180ms ease-out;
}
.bottom-bar-toast[data-visible='true'] { opacity: 1; transform: translate(-50%, 0); }

@media (prefers-reduced-motion: reduce) {
  .account-panel, .account-chevron, .account-toggle-btn, .account-copy-btn, .account-copy-toast,
  .bottom-bar-copy-btn, .bottom-bar-toast, .gallery-thumb-img {
    transition-duration: 0.01ms;
  }
}
`;

/**
 * 계좌 아코디언(클릭 시 `/api/accounts/<slug>` fetch) + 갤러리 라이트박스 + 링크 복사
 * 인터랙션을 담당하는 순수 vanilla JS. `AccountSection.tsx`의 동작(최초 클릭 시에만
 * fetch, 이후 캐시, 신랑/신부 각각 독립 토글, 계좌번호 복사 토스트)을 그대로 옮긴다.
 *
 * 템플릿 리터럴이 아니라 일반 문자열로 짠다 — 이 스크립트 자체가 백틱/`${}`를 전혀
 * 쓰지 않으므로, 이 파일을 감싸는 바깥 템플릿 리터럴과 충돌할 걱정 없이 그대로 삽입할
 * 수 있다.
 */
const CLIENT_SCRIPT = `
(function () {
  'use strict';

  var SIDE_LABEL = { groom: '신랑', bride: '신부' };

  function qs(selector, root) { return (root || document).querySelector(selector); }
  function qsa(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  /* ---------- 계좌 아코디언 ---------- */
  var slug = document.body.getAttribute('data-slug') || '';
  var accountsCache = null;
  var accountsPromise = null;

  function fetchAccounts() {
    if (accountsCache) return Promise.resolve(accountsCache);
    if (accountsPromise) return accountsPromise;
    accountsPromise = fetch('/api/accounts/' + encodeURIComponent(slug))
      .then(function (response) {
        if (!response.ok) throw new Error('status ' + response.status);
        return response.json();
      })
      .then(function (data) {
        accountsCache = data;
        return data;
      });
    return accountsPromise;
  }

  function entriesForSide(side, accounts) {
    var own = side === 'groom' ? accounts.groom : accounts.bride;
    var father = side === 'groom' ? accounts.groomFather : accounts.brideFather;
    var mother = side === 'groom' ? accounts.groomMother : accounts.brideMother;
    var label = SIDE_LABEL[side];
    var entries = [];
    if (own) entries.push({ key: side + '-own', label: label + ' 계좌', info: own });
    if (father) entries.push({ key: side + '-father', label: label + '측 아버지 계좌', info: father });
    if (mother) entries.push({ key: side + '-mother', label: label + '측 어머니 계좌', info: mother });
    return entries;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderPanelContent(side, state, accounts) {
    var content = qs('.account-panel-content[data-side="' + side + '"]');
    if (!content) return;
    if (state === 'loading') {
      content.innerHTML = '<p class="account-status">계좌 정보를 불러오는 중…</p>';
      return;
    }
    if (state === 'error') {
      content.innerHTML = '<p class="account-status-error">계좌 정보를 불러오지 못했습니다. 다시 시도해 주세요.</p>';
      return;
    }
    var entries = entriesForSide(side, accounts || {});
    if (entries.length === 0) {
      content.innerHTML = '<p class="account-status">등록된 계좌 정보가 없습니다.</p>';
      return;
    }
    var html = '<ul class="account-list">';
    entries.forEach(function (entry) {
      html +=
        '<li class="account-card" data-entry="' + entry.key + '">' +
        '<p class="account-card-label">' + escapeHtml(entry.label) + '</p>' +
        '<p class="account-card-bank">' + escapeHtml(entry.info.bank) + '</p>' +
        '<div class="account-number-row">' +
        '<p class="account-number">' + escapeHtml(entry.info.accountNumber) + '</p>' +
        '<button type="button" class="account-copy-btn" data-copy-number="' + escapeHtml(entry.info.accountNumber) + '" data-entry-key="' + entry.key + '">계좌번호 복사</button>' +
        '</div>' +
        '<p class="account-holder">예금주 ' + escapeHtml(entry.info.holder) + '</p>' +
        '<span class="account-copy-toast" data-entry-toast="' + entry.key + '" aria-live="polite"></span>' +
        '</li>';
    });
    html += '</ul>';
    content.innerHTML = html;

    qsa('[data-copy-number]', content).forEach(function (button) {
      button.addEventListener('click', function () {
        var number = button.getAttribute('data-copy-number') || '';
        var key = button.getAttribute('data-entry-key') || '';
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(number).then(function () {
          var toast = qs('[data-entry-toast="' + key + '"]', content);
          if (!toast) return;
          toast.textContent = '복사됨';
          toast.setAttribute('data-visible', 'true');
          setTimeout(function () {
            toast.setAttribute('data-visible', 'false');
            toast.textContent = '';
          }, 1600);
        }).catch(function () {
          /* 클립보드 권한 없는 환경 — 조용히 무시 */
        });
      });
    });
  }

  function ensureLoaded(side) {
    if (accountsCache) {
      renderPanelContent(side, 'idle', accountsCache);
      return;
    }
    renderPanelContent(side, 'loading', null);
    fetchAccounts()
      .then(function (data) { renderPanelContent(side, 'idle', data); })
      .catch(function () { renderPanelContent(side, 'error', null); });
  }

  qsa('.account-toggle-btn').forEach(function (button) {
    button.addEventListener('click', function () {
      var side = button.getAttribute('data-side');
      var panel = qs('.account-panel[data-side="' + side + '"]');
      var isOpen = button.getAttribute('aria-expanded') === 'true';
      var nextOpen = !isOpen;

      qsa('.account-toggle-btn').forEach(function (otherButton) {
        var otherSide = otherButton.getAttribute('data-side');
        var otherPanel = qs('.account-panel[data-side="' + otherSide + '"]');
        var open = otherSide === side ? nextOpen : false;
        otherButton.setAttribute('aria-expanded', String(open));
        if (otherPanel) otherPanel.setAttribute('data-open', String(open));
      });

      if (nextOpen) ensureLoaded(side);
    });
  });

  /* ---------- 갤러리 라이트박스 ---------- */
  var overlay = qs('.gallery-overlay');
  var expandedImage = overlay ? qs('.gallery-expanded-img', overlay) : null;
  var lastFocused = null;

  function openLightbox(url, triggerEl) {
    if (!overlay || !expandedImage) return;
    expandedImage.src = url;
    overlay.setAttribute('data-open', 'true');
    lastFocused = triggerEl || null;
    var closeButton = qs('.gallery-close-btn', overlay);
    if (closeButton) closeButton.focus();
  }

  function closeLightbox() {
    if (!overlay) return;
    overlay.setAttribute('data-open', 'false');
    if (lastFocused) lastFocused.focus();
    lastFocused = null;
  }

  qsa('.gallery-thumb-btn').forEach(function (button) {
    button.addEventListener('click', function () {
      var url = button.getAttribute('data-full');
      if (url) openLightbox(url, button);
    });
  });

  if (overlay) {
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeLightbox();
    });
    var closeBtn = qs('.gallery-close-btn', overlay);
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && overlay && overlay.getAttribute('data-open') === 'true') {
      closeLightbox();
    }
  });

  /* ---------- 하단 링크 복사 바 ---------- */
  var bottomBarButton = qs('.bottom-bar-copy-btn');
  var bottomBarToast = qs('.bottom-bar-toast');
  if (bottomBarButton && bottomBarToast && navigator.clipboard) {
    bottomBarButton.addEventListener('click', function () {
      navigator.clipboard.writeText(window.location.href).then(function () {
        bottomBarToast.textContent = '링크가 복사되었습니다';
        bottomBarToast.setAttribute('data-visible', 'true');
        setTimeout(function () {
          bottomBarToast.setAttribute('data-visible', 'false');
          bottomBarToast.textContent = '';
        }, 1600);
      }).catch(function () {
        /* 클립보드 권한 없는 환경 — 조용히 무시 */
      });
    });
  }
})();
`;

function renderHero(data: RenderInvitationHtmlInput): string {
  const formatted = formatWeddingDateTime(data.weddingDateTime);
  const dateBlock = formatted
    ? `<time class="hero-date-time" datetime="${escapeAttr(formatted.isoDateTime)}">` +
      `<span class="hero-date-line">${escapeHtml(formatted.dateLabel)}</span>` +
      `<span class="hero-time-line">${escapeHtml(formatted.timeLabel)}</span>` +
      `</time>`
    : '';

  return [
    '<section class="hero" aria-label="청첩장 대표 정보">',
    '<div class="hero-image-frame">',
    `<img src="${escapeAttr(data.mainImageUrl)}" alt="신랑 ${escapeAttr(data.groomName)}, 신부 ${escapeAttr(data.brideName)}의 결혼식 대표 사진" class="hero-image" />`,
    '</div>',
    '<div class="hero-divider" aria-hidden="true"></div>',
    '<div class="hero-details">',
    `<div class="hero-date-block">${dateBlock}</div>`,
    '<h1 class="hero-names">',
    `<span class="hero-name">${escapeHtml(data.groomName)}</span>`,
    `<span class="hero-name">${escapeHtml(data.brideName)}</span>`,
    '</h1>',
    '</div>',
    '</section>',
  ].join('');
}

function renderInviteMessage(data: RenderInvitationHtmlInput): string {
  const lines = data.content.split('\n');
  const lineHtml = lines
    .map((line) => `<p class="invite-message-line">${line ? escapeHtml(line) : '&nbsp;'}</p>`)
    .join('');

  return [
    '<section class="invite-message" aria-label="초대 문구">',
    data.title ? `<p class="invite-message-title">${escapeHtml(data.title)}</p>` : '',
    `<div class="invite-message-body">${lineHtml}</div>`,
    '</section>',
  ].join('');
}

function renderParentsSection(data: RenderInvitationHtmlInput): string {
  function column(title: string, fatherName: string, motherName: string): string {
    return [
      '<div class="parents-column">',
      `<p class="parents-column-title">${escapeHtml(title)}</p>`,
      '<dl class="parents-rows">',
      '<div class="parents-row">',
      '<dt class="parents-role">아버지</dt>',
      `<dd class="parents-name">${escapeHtml(fatherName)}</dd>`,
      '</div>',
      '<div class="parents-row">',
      '<dt class="parents-role">어머니</dt>',
      `<dd class="parents-name">${escapeHtml(motherName)}</dd>`,
      '</div>',
      '</dl>',
      '</div>',
    ].join('');
  }

  return [
    '<section class="parents" aria-label="혼주 안내">',
    '<div class="parents-columns">',
    column('신랑측 혼주', data.groomFatherName, data.groomMotherName),
    '<div class="parents-divider" aria-hidden="true"></div>',
    column('신부측 혼주', data.brideFatherName, data.brideMotherName),
    '</div>',
    '</section>',
  ].join('');
}

function renderGallery(data: RenderInvitationHtmlInput): string {
  if (data.galleryImageUrls.length === 0) return '';

  const thumbs = data.galleryImageUrls
    .map(
      (url, index) =>
        `<button type="button" class="gallery-thumb-btn" data-full="${escapeAttr(url)}" aria-label="갤러리 사진 ${index + 1}번 확대 보기">` +
        `<img src="${escapeAttr(url)}" alt="" class="gallery-thumb-img" /></button>`,
    )
    .join('');

  return [
    '<section class="gallery" aria-label="갤러리">',
    '<p class="gallery-label">GALLERY</p>',
    `<div class="gallery-grid">${thumbs}</div>`,
    '<div class="gallery-overlay" data-open="false" role="dialog" aria-modal="true" aria-label="갤러리 사진 확대 보기">',
    '<button type="button" class="gallery-close-btn" aria-label="확대 보기 닫기">',
    '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18" /></svg>',
    '</button>',
    '<img class="gallery-expanded-img" alt="" />',
    '</div>',
    '</section>',
  ].join('');
}

function renderAccountSection(): string {
  const sides: Array<{ side: 'groom' | 'bride'; label: string }> = [
    { side: 'groom', label: '신랑' },
    { side: 'bride', label: '신부' },
  ];

  const buttons = sides
    .map(
      ({ side, label }) =>
        `<button type="button" id="account-toggle-${side}" class="account-toggle-btn" data-side="${side}" aria-expanded="false" aria-controls="account-panel-${side}">` +
        `<span>${escapeHtml(label)} 측 계좌번호</span>` +
        '<svg aria-hidden="true" class="account-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>' +
        '</button>',
    )
    .join('');

  const panels = sides
    .map(
      ({ side }) =>
        `<div id="account-panel-${side}" class="account-panel" data-side="${side}" data-open="false" role="region" aria-labelledby="account-toggle-${side}">` +
        '<div class="account-panel-inner"><div class="account-panel-content" data-side="' +
        side +
        '"></div></div>' +
        '</div>',
    )
    .join('');

  return [
    '<section class="account" aria-label="계좌 안내">',
    '<p class="account-label">ACCOUNT</p>',
    '<p class="account-hint">마음 전하실 곳을 안내해 드려요</p>',
    `<div class="account-button-row">${buttons}</div>`,
    panels,
    '</section>',
  ].join('');
}

function renderBottomBar(): string {
  return [
    '<div class="bottom-bar">',
    '<div class="bottom-bar-inner">',
    '<span class="bottom-bar-toast" data-visible="false" aria-live="polite"></span>',
    '<button type="button" class="bottom-bar-copy-btn">링크 복사</button>',
    '</div>',
    '</div>',
  ].join('');
}

/**
 * `custom/<slug>/index.html`의 전체 HTML 문서를 만든다.
 *
 * 섹션 순서(히어로→초대문구→혼주→갤러리→계좌→하단바)는 `app/app/invite/preview/page.tsx`
 * (harness-0i2 데모 라우트)와 동일하게 맞춘다.
 */
export function renderInvitationHtml(data: RenderInvitationHtmlInput): string {
  const displayTitle = data.title || `${data.groomName} ♥ ${data.brideName}`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0" />
<meta name="robots" content="noindex" />
<title>${escapeHtml(displayTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>${CSS}</style>
</head>
<body data-slug="${escapeAttr(data.slug)}">
<div class="page-scope">
<main class="page">
${renderHero(data)}
${renderInviteMessage(data)}
${renderParentsSection(data)}
${renderGallery(data)}
${renderAccountSection()}
</main>
${renderBottomBar()}
</div>
<script>${CLIENT_SCRIPT}</script>
</body>
</html>
`;
}
