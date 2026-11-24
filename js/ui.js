/* 药理学 · 路由 / 头部 / 底栏 / 弹窗 */
(function () {
  'use strict';
  var esc = window.YL.esc;

  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 5.5V20.5"/>',
    bulb: '<path d="M9.5 18h5"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9V16h5.2v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3z"/>',
    quiz: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    me: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    back: '<path d="M15 5 8 12l7 7"/>',
    note: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 10h8M8 14h5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    star: '<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z"/>',
    hide: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.4"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v6h-6"/>',
    tip: '<path d="M12 21s-7-4.4-7-9a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 12c0 4.6-7 9-7 9z"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4.2" cy="6" r="1"/><circle cx="4.2" cy="12" r="1"/><circle cx="4.2" cy="18" r="1"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    img: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  var TABS = [
    { id: 'home', hash: '#/home', name: '首页', icon: 'home' },
    { id: 'mat', hash: '#/mat', name: '教材', icon: 'book' },
    { id: 'kp', hash: '#/kp', name: '要点', icon: 'bulb' },
    { id: 'quiz', hash: '#/quiz', name: '刷题', icon: 'quiz' },
    { id: 'me', hash: '#/me', name: '我的', icon: 'me' }
  ];
  var VIEWS = {};
  var state = { route: { name: 'home', p: [], q: {} }, tab: 'home' };

  function header(opts) {
    opts = opts || {};
    var h = [];
    if (opts.back) h.push('<button class="hd-btn" id="hd-back" aria-label="返回">' + icon('back') + '</button>');
    h.push('<div class="hd-title">' + (opts.title || '药理学') + (opts.sub ? '<small>' + esc(opts.sub) + '</small>' : '') + '</div>');
    (opts.actions || []).forEach(function (a, i) {
      h.push('<button class="hd-btn" data-hact="' + i + '" aria-label="' + esc(a.label || '') + '">' +
        (a.icon ? icon(a.icon) : '') + (a.text ? '<span>' + esc(a.text) + '</span>' : '') + '</button>');
    });
    var el = document.getElementById('hd');
    el.innerHTML = h.join('');
    var b = document.getElementById('hd-back');
    if (b) b.onclick = function () { opts.backTo ? replaceHash(opts.backTo) : back(); };
    (opts.actions || []).forEach(function (a, i) {
      var btn = el.querySelector('[data-hact="' + i + '"]');
      if (btn) btn.onclick = function (e) { e.preventDefault(); a.onClick && a.onClick(); };
    });
  }

  function tabbar(active) {
    state.tab = active || state.tab;
    document.getElementById('tabbar').innerHTML = TABS.map(function (t) {
      return '<a href="' + t.hash + '" class="' + (t.id === state.tab ? 'on' : '') + '">' + icon(t.icon) + '<span>' + t.name + '</span></a>';
    }).join('');
  }

  function parseHash() {
    var h = location.hash || '#/home';
    h = h.replace(/^#\/?/, '');
    var qi = h.indexOf('?'), q = {};
    if (qi >= 0) {
      h.slice(qi + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
      });
      h = h.slice(0, qi);
    }
    var parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'home', p: parts.slice(1), q: q };
  }

  var TAB_OF = {
    home: 'home', mat: 'mat', entry: 'mat', kp: 'kp', kpch: 'kp', kpi: 'kp',
    quiz: 'quiz', qrun: 'quiz', qcard: 'quiz', qtypes: 'quiz', qwrong: 'quiz',
    search: 'home', fav: 'me', me: 'me', about: 'me', tip: 'me'
  };

  function render() {
    var r = parseHash();
    state.route = r;
    var v = VIEWS[r.name] || VIEWS.home;
    var main = document.getElementById('main');
    main.className = '';
    main.innerHTML = '';
    window.scrollTo(0, 0);
    document.body.classList.remove('drawer-open');
    try { v(main, r.p, r.q); }
    catch (e) {
      main.innerHTML = '<div class="empty"><span class="em-ico">⚠</span>页面出错了<br><span class="tiny">' +
        esc(e && e.message ? e.message : e) + '</span></div>';
      header({ title: '出错' });
    }
    tabbar(TAB_OF[r.name] || 'home');
  }
  function go(hash) { if (location.hash === hash) { render(); return; } location.hash = hash; }
  function replaceHash(hash) {
    if (location.hash === hash) { render(); return; }
    try { history.replaceState(null, '', hash); render(); } catch (e) { location.hash = hash; }
  }
  function back() { if (location.hash && location.hash !== '#/home') history.back(); else go('#/home'); }

  var dlgResolve = null;
  function dialog(opts) {
    opts = opts || {};
    var el = document.getElementById('dialog');
    var btns = (opts.buttons && opts.buttons.length) ? opts.buttons : [{ text: '知道了', value: true, primary: true }];
    el.innerHTML = '<div class="dlg" role="dialog" aria-modal="true">' +
      (opts.title ? '<h3>' + esc(opts.title) + '</h3>' : '') +
      (opts.html ? '<div class="dtxt">' + opts.html + '</div>' : (opts.text ? '<div class="dtxt">' + esc(opts.text) + '</div>' : '')) +
      '<div class="dact">' + btns.map(function (b, i) {
        return '<button class="btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '') +
          '" data-di="' + i + '">' + esc(b.text) + '</button>';
      }).join('') + '</div></div>';
    el.classList.add('on');
    return new Promise(function (resolve) {
      dlgResolve = resolve;
      el.querySelectorAll('[data-di]').forEach(function (b) {
        b.onclick = function () { closeDialog(btns[+b.getAttribute('data-di')].value); };
      });
      el.onclick = function (e) { if (e.target === el && opts.dismissible !== false) closeDialog(null); };
    });
  }
  function closeDialog(v) {
    var el = document.getElementById('dialog');
    el.classList.remove('on'); el.innerHTML = '';
    var r = dlgResolve; dlgResolve = null;
    if (r) r(v);
  }
  function confirmDialog(title, text, okText, cancelText) {
    return dialog({ title: title, text: text,
      buttons: [{ text: cancelText || '取消', value: false }, { text: okText || '确定', value: true, primary: true }] });
  }
  function dialogOpen() { return document.getElementById('dialog').classList.contains('on'); }

  var toastTimer = null;
  function toast(msg, ms) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, ms || 1600);
  }
  function emptyBox(text, tip) {
    return '<div class="empty"><span class="em-ico">◌</span>' + esc(text) +
      (tip ? '<div class="tiny" style="margin-top:6px">' + esc(tip) + '</div>' : '') + '</div>';
  }


  /* 全局图片点击放大：任何内容区图片（表格/导图/卡片图/答案图）都支持 */
  (function globalImgZoom() {
    if (window.__ylImgZoom) return;
    window.__ylImgZoom = 1;
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || t.tagName !== 'IMG') return;
      if (t.closest && (t.closest('#iv') || t.closest('.no-zoom'))) return;
      var src = t.getAttribute('src');
      if (!src) return;
      ev.stopPropagation();
      ev.preventDefault();
      lightbox(src);
    }, true);
  })();

  function lightbox(src) {
    var el = document.getElementById('imgv');
    if (!el) { el = document.createElement('div'); el.id = 'imgv'; document.body.appendChild(el); }
    el.innerHTML = '<div class="iv-close">✕</div><img src="' + src + '" alt="">';
    el.classList.add('on');
    el.onclick = function () { el.classList.remove('on'); el.innerHTML = ''; };
  }

  window.YL_UI = {
    lightbox: lightbox,
    ICONS: ICONS, icon: icon, TABS: TABS, VIEWS: VIEWS, state: state,
    header: header, tabbar: tabbar, render: render, go: go, replaceHash: replaceHash, back: back,
    dialog: dialog, closeDialog: closeDialog, confirmDialog: confirmDialog, dialogOpen: dialogOpen,
    toast: toast, emptyBox: emptyBox, parseHash: parseHash
  };
})();
