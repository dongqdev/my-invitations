/*
   private.js (my-invitations 어댑터 버전 — 원본: nerdkim/wedding-invitation-for-nerds)

   원본은 invitation.conf 의 계좌를 build 시점에 XOR 난독화해 window.__GIFT__ 로
   정적 HTML에 심고, 이 script가 그것을 그 자리에서 복호화했다. 우리는 계좌를
   git에 전혀 넣지 않고(harness-8lh.4) 별도 서버에 저장해 두므로, 이 버전은
   window.__GIFT__ 를 읽지 않는다 — 대신 사용자가 펼치거나 tap하는 바로 그 순간에
   window.__ACCOUNTS_API_BASE__ + '/api/accounts/' + window.__SLUG__ 로 fetch한다.
   그래서 계좌 평문은 애초에 정적 파일 어디에도 존재하지 않는다(빌드 시점 심기 자체가
   없다) — obfuscate/deobfuscate 관련 코드는 전부 제거했다.

   /api/accounts/<slug> 응답 형태는 원본의 {accounts:{groom:[...], bride:[...]}}가
   아니라 { groom?, bride?, groomFather?, groomMother?, brideFather?, brideMother? }
   (각 { bank, holder, accountNumber })이다 — shapeAccounts()가 groom 쪽
   (groom, groomFather, groomMother)과 bride 쪽(bride, brideFather, brideMother)을
   각각 리스트로 묶어 원본과 같은 모양으로 바꿔 준다.

   HTML container 규약(원본과 동일, 변경 없음):
     [data-acc="groom|bride"]      계좌 목록을 채울 곳
     [data-contact="groom|bride"]  연락처 목록을 채울 곳(계좌와 완전히 같은 규약,
                                    별도 API `/api/contacts/<slug>` — 아래 참고)
     data-copy-label="복사"         복사(계좌)/전화(연락처) button 글자. theme마다 복사, copy, cp를 쓴다.
     data-open                     tap이나 펼침 없이 즉시 render(terminal version)
     data-reveal-label="..."       펼침 button 글자. details 안에 있으면 필요 없다.

   연락처는 window.__CONTACTS_API_BASE__ + '/api/contacts/' + window.__SLUG__ 로
   fetch한다 — 계좌와 마찬가지로 개인정보라 git에 넣지 않고 서버 로컬에 저장해
   두므로(`lib/contactStore.ts`), 정적 파일에는 전화번호 평문이 존재하지 않는다.
 */
(function () {
  'use strict';

  var API_BASE = (typeof window !== 'undefined' && window.__ACCOUNTS_API_BASE__) || '';
  var SLUG = (typeof window !== 'undefined' && window.__SLUG__) || '';

  /* 응답을 원본 render 로직이 기대하는 {accounts:{groom:[...], bride:[...]}} 모양으로 바꾼다. */
  function shapeAccounts(raw) {
    if (!raw) return null;
    function person(a) {
      if (!a) return null;
      return { name: a.holder || '', bank: a.bank || '', number: a.accountNumber || '' };
    }
    var groom = [person(raw.groom), person(raw.groomFather), person(raw.groomMother)].filter(
      Boolean,
    );
    var bride = [person(raw.bride), person(raw.brideFather), person(raw.brideMother)].filter(
      Boolean,
    );
    return { accounts: { groom: groom, bride: bride } };
  }

  var fetchPromise = null;
  function fetchAccounts() {
    /* /create의 라이브 미리보기(harness 없음, my-invitations 자체 기능)는 슬러그가
       확정되지 않아 서버에 저장된 계좌가 없다 — 대신 /api/preview가 지금 폼에
       입력된 값을 이 창에 직접 심어 준다(window.__PREVIEW_ACCOUNTS__). 있으면
       fetch를 건너뛰고 그 값을 그대로 쓴다 — 실제 발행된 청첩장(/i/<slug>)에는
       이 값이 절대 심기지 않으므로 이 분기를 타지 않는다. */
    if (typeof window !== 'undefined' && window.__PREVIEW_ACCOUNTS__) {
      return Promise.resolve(shapeAccounts(window.__PREVIEW_ACCOUNTS__));
    }
    if (!SLUG) return Promise.resolve(null);
    if (!fetchPromise) {
      fetchPromise = fetch(API_BASE + '/api/accounts/' + encodeURIComponent(SLUG))
        .then(function (res) {
          if (!res.ok) throw new Error('accounts fetch failed: ' + res.status);
          return res.json();
        })
        .then(shapeAccounts)
        .catch(function () {
          return null;
        });
    }
    return fetchPromise;
  }

  /* 연락처(전화번호) — 계좌와 완전히 같은 패턴(별도 API/저장소, 펼칠 때에만 fetch). */
  var CONTACTS_API_BASE = (typeof window !== 'undefined' && window.__CONTACTS_API_BASE__) || '';
  var CONTACT_LABELS = {
    groom: '신랑',
    groomFather: '아버지',
    groomMother: '어머니',
    bride: '신부',
    brideFather: '아버지',
    brideMother: '어머니',
  };

  function shapeContactsForSide(side, raw) {
    if (!raw) return [];
    var keys =
      side === 'groom'
        ? ['groom', 'groomFather', 'groomMother']
        : ['bride', 'brideFather', 'brideMother'];
    var list = [];
    keys.forEach(function (key) {
      if (raw[key]) list.push({ label: CONTACT_LABELS[key], phone: raw[key] });
    });
    return list;
  }

  var contactsFetchPromise = null;
  function fetchContacts() {
    /* fetchAccounts()와 같은 이유 — 미리보기 창에서는 fetch 대신 심어진 값을 쓴다. */
    if (typeof window !== 'undefined' && window.__PREVIEW_CONTACTS__) {
      return Promise.resolve(window.__PREVIEW_CONTACTS__);
    }
    if (!SLUG) return Promise.resolve(null);
    if (!contactsFetchPromise) {
      contactsFetchPromise = fetch(CONTACTS_API_BASE + '/api/contacts/' + encodeURIComponent(SLUG))
        .then(function (res) {
          if (!res.ok) throw new Error('contacts fetch failed: ' + res.status);
          return res.json();
        })
        .catch(function () {
          return null;
        });
    }
    return contactsFetchPromise;
  }

  /* clipboard 복사 (theme의 flashCopied 가 있으면 그대로 사용) */
  function copy(text, btn) {
    navigator.clipboard
      .writeText(text)
      .then(function () {
        if (typeof window.flashCopied === 'function') {
          window.flashCopied(btn);
        } else {
          var o = btn.textContent;
          btn.textContent = '✓';
          setTimeout(function () {
            btn.textContent = o;
          }, 1500);
        }
      })
      .catch(function () {});
  }

  /* 한 줄(.acc) 만들기: 이름, 은행과 번호, 복사 button. 원본과 동일한 DOM 모양. */
  function row(name, bank, number, copyLabel) {
    var el = document.createElement('div');
    el.className = 'acc';

    var nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = name;

    var no = document.createElement('span');
    no.className = 'no';
    if (bank) {
      var bk = document.createElement('span');
      bk.className = 'bank';
      bk.textContent = bank;
      no.appendChild(bk);
      no.appendChild(document.createTextNode(' '));
    }
    var nu = document.createElement('span');
    nu.className = 'num';
    nu.textContent = number;
    no.appendChild(nu);

    var value = (bank ? bank + ' ' : '') + number;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = copyLabel;
    btn.addEventListener('click', function () {
      copy(value, btn);
    });

    el.append(nm, no, btn);
    return el;
  }

  function renderAccounts(container, data) {
    var list = (data && data.accounts && data.accounts[container.dataset.acc]) || [];
    var copyLabel = container.dataset.copyLabel || '복사';
    if (list.length === 0) {
      var note = document.createElement('div');
      note.className = 'acc-note';
      note.textContent = '등록된 계좌 정보가 없습니다.';
      container.appendChild(note);
      return;
    }
    list.forEach(function (a) {
      container.appendChild(row(a.name, a.bank, a.number, copyLabel));
    });
  }

  /* 한 줄(.acc) 만들기: 이름, 전화번호, tel: 링크 button. row()와 같은 DOM 모양(.nm/.no)을
     쓰되, 복사 대신 바로 전화 거는 <a href="tel:">를 마지막 자리에 둔다. */
  function contactRow(label, phone, callLabel) {
    var el = document.createElement('div');
    el.className = 'acc';

    var nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = label;

    var no = document.createElement('span');
    no.className = 'no';
    no.textContent = phone;

    var call = document.createElement('a');
    call.className = 'acc-call-btn';
    call.href = 'tel:' + phone;
    call.textContent = callLabel;

    el.append(nm, no, call);
    return el;
  }

  function renderContacts(container, data) {
    var list = shapeContactsForSide(container.dataset.contact, data);
    var copyLabel = container.dataset.copyLabel || '복사';
    var callLabel = copyLabel === 'cp' ? 'call' : copyLabel === 'copy' ? 'call' : '전화';
    if (list.length === 0) {
      var note = document.createElement('div');
      note.className = 'acc-note';
      note.textContent = '등록된 연락처가 없습니다.';
      container.appendChild(note);
      return;
    }
    list.forEach(function (c) {
      container.appendChild(contactRow(c.label, c.phone, callLabel));
    });
  }

  /* 펼치거나 tap할 때에만 fetch+render한다 — 계좌/연락처 API 요청 자체가 사용자
     의도적 행동 뒤에만 나가게 해서, 페이지를 열기만 해도 서버에 요청이 가지 않게
     한다. container가 data-acc면 계좌를, data-contact면 연락처를 그린다. */
  function doRender(container) {
    if (container.dataset.filled) return;
    container.dataset.filled = '1';
    if (container.dataset.contact) {
      fetchContacts().then(function (data) {
        renderContacts(container, data);
      });
    } else {
      fetchAccounts().then(function (data) {
        renderAccounts(container, data);
      });
    }
  }

  function gate(container) {
    if (container.hasAttribute('data-open')) {
      doRender(container);
      return;
    }

    var details = container.closest('details');
    if (details) {
      details.addEventListener('toggle', function () {
        if (details.open) doRender(container);
      });
      return;
    }

    var trig = document.createElement('button');
    trig.type = 'button';
    trig.className = 'btn reveal-btn';
    trig.textContent = container.dataset.revealLabel || '보기 ▾';
    trig.addEventListener('click', function () {
      trig.remove();
      doRender(container);
    });
    container.appendChild(trig);
  }

  function init() {
    var accs = document.querySelectorAll('[data-acc]');
    var contacts = document.querySelectorAll('[data-contact]');
    if (!SLUG) {
      [].forEach.call(accs, function (c) {
        var n = document.createElement('div');
        n.className = 'acc-note';
        n.textContent = '계좌는 서버에서 안전하게 제공됩니다.';
        c.appendChild(n);
      });
      [].forEach.call(contacts, function (c) {
        var n = document.createElement('div');
        n.className = 'acc-note';
        n.textContent = '연락처는 서버에서 안전하게 제공됩니다.';
        c.appendChild(n);
      });
      return;
    }
    [].forEach.call(accs, gate);
    [].forEach.call(contacts, gate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
