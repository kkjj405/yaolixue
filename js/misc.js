/* 药理学 · 首页 / 搜索 / 我的 / 关于 / 打赏 */
(function () {
  'use strict';
  var Z = window.YL, UI = window.YL_UI;
  var esc = Z.esc, icon = UI.icon;
  var VER = window.YL_VERSION || { web: '1.0.0' };

  var ANN = [
    '该程序内容完全基于人民卫生出版社《药理学》与《药理学学习指导与习题集》，仅供学习使用，不提供临床指导。',
    '如果觉得有用的话，可以分享给身边的朋友、同学。',
    '制作不易，可以给作者一点赞赏嘛，赞赏入口在「我的 → 赞赏支持」。'
  ];

  function annHTML() {
    var open = Z.store.meta.annOpen !== false;
    return '<div class="ann' + (open ? ' open' : '') + '" id="ann"><div class="ann-hd" id="ann-hd">' +
      '<span class="ann-ic">📢</span><span class="ann-t">公告</span>' +
      '<span class="ann-more">' + (open ? '收起' : '展开') + '</span>' +
      '<span class="ann-caret">▸</span></div><div class="ann-bd">' +
      ANN.map(function (x, i) { return '<div class="ann-i"><span class="ann-n">' + (i + 1) + '</span><span>' + esc(x) + '</span></div>'; }).join('') +
      '</div></div>';
  }

  function renderHome(main) {
    UI.header({ title: '药理学' });
    var ms = Z.MAT.stats, ks = Z.KP.stats, qs = Z.QZ.stats;
    var h = ['<div class="hero">' +
      '<h1 class="hero-t serif">药理学</h1>' +
      '<div class="hero-en">PHARMACOLOGY</div>' +
      '<p class="hero-d">教材卡片 · 知识要点 · 自测刷题</p>' +
      '<div class="hero-stats">' +
      '<div class="hs"><b>' + ms.cards + '</b><span>张卡片</span></div>' +
      '<div class="hs"><b>' + ks.items + '</b><span>条要点</span></div>' +
      '<div class="hs"><b>' + qs.questions + '</b><span>道自测题</span></div>' +
      '</div></div>'];
    h.push(annHTML());
    h.push('<div class="big-grid">' +
      '<a class="big" href="#/mat"><div class="big-ic">' + icon('book') + '</div><div class="big-t">教材卡片</div>' +
      '<div class="big-s">' + ms.chapters + ' 章 · ' + ms.cards + ' 张卡<br>药物卡 / 概论卡</div></a>' +
      '<a class="big" href="#/kp"><div class="big-ic">' + icon('bulb') + '</div><div class="big-t">知识要点</div>' +
      '<div class="big-s">' + ks.chapters + ' 章 · ' + ks.items + ' 条<br>导图 · 表格 · 速记</div></a>' +
      '<a class="big" href="#/quiz"><div class="big-ic">' + icon('quiz') + '</div><div class="big-t">自测刷题</div>' +
      '<div class="big-s">' + qs.questions + ' 题 · 5 种题型<br>答题卡 · 错题 · 收藏</div></a>' +
      '<a class="big" href="#/search"><div class="big-ic">' + icon('search') + '</div><div class="big-t">搜索</div>' +
      '<div class="big-s">药名 / 英文 / 内容<br>教材与要点全覆盖</div></a></div>');
    var favN = Object.keys(Z.store.fav).length;
    h.push('<div class="card list"><a class="li" href="#/fav"><span class="li-ic">' + icon('star') + '</span>' +
      '<span class="grow"><span class="li-t">我的收藏</span><span class="li-s">教材卡片 ' + favN + ' 张</span></span><span class="at-go">›</span></a></div>');
    main.innerHTML = h.join('');
    var ann = main.querySelector('#ann-hd');
    if (ann) ann.onclick = function () {
      var box = main.querySelector('#ann');
      var open = !box.classList.contains('open');
      box.classList.toggle('open', open);
      Z.store.meta.annOpen = open; Z.save();
      var m = box.querySelector('.ann-more'); if (m) m.textContent = open ? '收起' : '展开';
    };
  }

  function renderSearch(main, p, q) {
    UI.header({ title: '搜索', back: true });
    main.innerHTML = '<div class="searchbox mb10"><svg class="s-ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke-width="1.9"/><path d="m16 16 4.5 4.5" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>' +
      '<input class="input" id="s-kw" placeholder="药名 / 英文名 / 关键词" value="' + esc((q && q.kw) || '') + '" autocomplete="off"></div><div id="s-res"></div>';
    var inp = main.querySelector('#s-kw'), box = main.querySelector('#s-res'), timer = null, composing = false;
    function run() {
      var kw = inp.value.trim();
      if (!kw) { box.innerHTML = '<div class="card flat"><p class="small muted" style="margin:0">输入药名（如 阿托品）、英文（atropine）或关键词（如 首过效应）。</p></div>'; return; }
      var r = Z.searchAll(kw);
      if (!r.entries.length && !r.kps.length) { box.innerHTML = UI.emptyBox('没有找到「' + kw + '」'); return; }
      var out = [];
      if (r.entries.length) {
        out.push('<div class="tiny dim" style="margin:2px 4px 6px">教材卡片 · ' + r.entries.length + '</div><div class="card flat" style="padding:2px 0">' +
          r.entries.map(function (e) {
            return '<a class="er" href="#/entry/' + e.id + '"><span class="er-kind ' + e.kind + '">' + (e.kind === 'drug' ? '药' : '概') +
              '</span><span class="er-nm">' + esc(e.name) + '</span></a>';
          }).join('') + '</div>');
      }
      if (r.kps.length) {
        out.push('<div class="tiny dim" style="margin:12px 4px 6px">知识要点 · ' + r.kps.length + '</div><div class="card flat" style="padding:2px 0">' +
          r.kps.map(function (i) { return '<a class="er" href="#/kpi/' + i.id + '"><span class="er-kind kp">要</span><span class="er-nm">' + esc(i.title) + '</span></a>'; }).join('') + '</div>');
      }
      box.innerHTML = out.join('');
    }
    inp.addEventListener('compositionstart', function () { composing = true; });
    inp.addEventListener('compositionend', function () { composing = false; run(); });
    inp.oninput = function () { if (composing) return; clearTimeout(timer); timer = setTimeout(run, 180); };
  }

  function renderFav(main) {
    UI.header({ title: '我的收藏', sub: '教材卡片', back: true, backTo: '#/me' });
    var ids = Object.keys(Z.store.fav).filter(function (id) { return Z.matBy[id] || Z.kpBy[id]; });
    var matIds = ids.filter(function (id) { return Z.matBy[id] && Z.matBy[id].kind !== 'group'; });
    var kpIds = ids.filter(function (id) { return Z.kpBy[id]; });
    var h = [];
    if (!ids.length) {
      h.push(UI.emptyBox('还没有收藏', '在教材卡片或知识要点里点「收藏」即可；刷题的题目收藏在刷题板块内'));
    } else {
      if (matIds.length) {
        h.push('<div class="tiny dim" style="margin:2px 4px 6px">教材卡片 · ' + matIds.length + ' 张</div>');
        h.push('<div class="card flat" style="padding:2px 0">' + matIds.map(function (id) {
          var e = Z.matBy[id], ch = Z.chapterById(e.chapterId);
          var ctx = e.kind === 'intro' ? (e.subName || '') : (ch ? ch.no : '');
          return '<div class="er" style="cursor:default"><a class="er-nm" href="#/entry/' + id + '" style="text-decoration:none;color:inherit">' +
            esc(e.name) + '<span class="tiny dim"> ' + esc(ctx) + '</span></a>' +
            '<button class="btn xs danger" data-uf="' + id + '">取消</button></div>';
        }).join('') + '</div>');
      }
      if (kpIds.length) {
        h.push('<div class="tiny dim" style="margin:12px 4px 6px">知识要点 · ' + kpIds.length + ' 条</div>');
        h.push('<div class="card flat" style="padding:2px 0">' + kpIds.map(function (id) {
          var it = Z.kpBy[id];
          return '<div class="er" style="cursor:default"><a class="er-nm" href="#/kpi/' + id + '" style="text-decoration:none;color:inherit">' +
            esc(it.title) + '</a><button class="btn xs danger" data-uf="' + id + '">取消</button></div>';
        }).join('') + '</div>');
      }
    }
    main.innerHTML = h.join('');
    main.querySelectorAll('[data-uf]').forEach(function (b) {
      b.onclick = function () { Z.toggleFav(b.getAttribute('data-uf')); UI.render(); };
    });
  }

  function renderMe(main) {
    UI.header({ title: '我的' });
    var favN = Object.keys(Z.store.fav).length;
    var h = ['<div class="card me-card"><div class="me-av">药</div><div class="grow"><div class="me-nm">药理学</div>' +
      '<div class="tiny dim">v' + esc(VER.web) + ' · ' + Z.MAT.stats.entries + ' 条教材 · ' + Z.QZ.stats.questions + ' 题</div></div></div>'];
    h.push('<div class="card list">' +
      '<a class="li" href="#/fav"><span class="li-ic">' + icon('star') + '</span><span class="grow"><span class="li-t">教材卡片收藏</span>' +
      '<span class="li-s">' + favN + ' 张（题目收藏在「刷题」板块内）</span></span><span class="at-go">›</span></a></div>');
    h.push('<div class="card list">' +
      '<div class="li"><span class="li-ic">' + icon('refresh') + '</span><span class="grow"><span class="li-t">检查更新</span>' +
      '<span class="li-s" id="upd-msg">点右侧按钮检查</span></span><button class="btn xs" id="upd-btn">检查</button>' +
      '<button class="btn xs ghost" id="upd-hard">强制刷新</button></div>' +
      '<div class="li"><span class="li-ic">' + icon('note') + '</span><span class="grow"><span class="li-t">备份与恢复</span>' +
      '<span class="li-s">导出/导入本机记录</span></span><button class="btn xs" id="bk-out">导出</button><button class="btn xs" id="bk-in">导入</button></div>' +
      '<div class="li"><span class="li-ic">' + icon('hide') + '</span><span class="grow"><span class="li-t">清空本机数据</span>' +
      '<span class="li-s">笔记 / 收藏 / 错题 / 进度</span></span><button class="btn xs danger" id="clr">清空</button></div></div>');
    h.push('<div class="card list"><a class="li" href="#/about"><span class="li-ic">' + icon('list') + '</span>' +
      '<span class="grow"><span class="li-t">关于</span><span class="li-s">数据来源与免责声明</span></span><span class="at-go">›</span></a>' +
      '<a class="li" href="#/tip"><span class="li-ic">' + icon('tip') + '</span><span class="grow"><span class="li-t">赞赏支持</span>' +
      '<span class="li-s">自愿 · 随意</span></span><span class="at-go">›</span></a></div>');
    main.innerHTML = h.join('');
    main.querySelector('#upd-btn').onclick = function () { checkUpdate(main); };
    main.querySelector('#upd-hard').onclick = function () { hardRefresh(main); };
    main.querySelector('#bk-out').onclick = exportAll;
    main.querySelector('#bk-in').onclick = importAll;
    main.querySelector('#clr').onclick = function () {
      UI.confirmDialog('清空本机数据', '将删除笔记、收藏、错题与做题记录，不可恢复。确定？', '清空', '取消').then(function (ok) {
        if (!ok) return;
        localStorage.removeItem('yl.data.v1'); UI.toast('已清空'); setTimeout(function () { location.reload(); }, 600);
      });
    };
  }

  function cmp(a, b) {
    var x = String(a || '0').split('.'), y = String(b || '0').split('.');
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var p = parseInt(x[i] || 0, 10), q = parseInt(y[i] || 0, 10);
      if (p !== q) return p > q ? 1 : -1;
    }
    return 0;
  }
  /* ---------------- 检查更新 / 强制刷新 ----------------
     2026-11-23 用户反馈「点了检查更新，等好一会才好」：
     原来是固定 1.2 秒后 reload，而新版本 SW 要下载 61 个文件（约 6 MB），
     刷新时还没装完 → 看起来像没更新。现在改成：
       · 下载期间给分段提示（正在下载/正在切换/已完成）；
       · 等新 SW 真正 installed 再刷新，并等 controllerchange 兜底；
       · 提供「强制刷新」：注销 SW + 清缓存后重载，作为兜底手段。
     另：新 SW 已把导图放独立缓存，图片没变时升级不再重下 3.6 MB。 */
  var updating = false;
  function sayIn(main, t) {
    var m = main && main.querySelector('#upd-msg');
    if (m) m.textContent = t;
  }
  function waitSwInstalled(reg, ms) {
    return new Promise(function (resolve) {
      var w = reg.installing || reg.waiting;
      if (!w) { resolve('none'); return; }
      if (w.state === 'installed' || w.state === 'activated') { resolve(w.state); return; }
      var done = false, timer = setTimeout(function () { if (!done) { done = true; resolve('timeout'); } }, ms || 30000);
      w.addEventListener('statechange', function () {
        if (done) return;
        if (w.state === 'installed' || w.state === 'activated' || w.state === 'redundant') {
          done = true; clearTimeout(timer); resolve(w.state);
        }
      });
    });
  }
  function reloadOnce() {
    if (window.__ylReloading) return;
    window.__ylReloading = true;
    location.reload();
  }
  function hardRefresh(main) {
    UI.confirmDialog('强制刷新',
      '将注销离线缓存并重新下载全部资源（约 4~6 MB）。本机的笔记、收藏、做题记录不受影响。\n' +
      '一般用不到；只有在「检查更新」反复无效时才需要。', '刷新', '取消').then(function (ok) {
        if (!ok) return;
        sayIn(main, '正在清理缓存…');
        var jobs = [];
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
            return Promise.all(rs.map(function (r) { return r.unregister(); }));
          }));
        }
        if (window.caches) {
          jobs.push(caches.keys().then(function (ks) {
            return Promise.all(ks.map(function (k) { return caches.delete(k); }));
          }));
        }
        Promise.all(jobs).then(function () {
          location.replace(location.pathname + '?u=' + Date.now() + (location.hash || '#/home'));
        }).catch(function () { location.reload(); });
      });
  }
  function checkUpdate(main) {
    if (updating) { UI.toast('正在更新，请稍候'); return; }
    updating = true;
    var say = function (t) { sayIn(main, t); };
    var done = function () { updating = false; };
    say('正在检查…');
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        var remote = j.web || '';
        var newer = cmp(remote, VER.web) > 0;
        var hasSW = !!(navigator.serviceWorker && navigator.serviceWorker.getRegistration);
        if (!hasSW) {
          if (newer) {
            say('发现 v' + remote + '，正在刷新…');
            setTimeout(function () { location.replace(location.pathname + '?u=' + Date.now() + (location.hash || '')); }, 400);
          } else { say('已是最新（v' + VER.web + '）'); UI.toast('已是最新版本'); }
          done(); return;
        }
        say(newer ? ('发现 v' + remote + '，正在下载…') : '正在核对离线缓存…');
        return navigator.serviceWorker.getRegistration().then(function (reg) {
          if (!reg) { say('离线缓存未启用，可用「强制刷新」'); done(); return; }
          return reg.update()
            .then(function () { return waitSwInstalled(reg, 40000); })
            .then(function (st) {
              if (st === 'installed' || st === 'activated') {
                say('新版本已下载，正在切换…');
                if (reg.waiting) { try { reg.waiting.postMessage('SKIP_WAITING'); } catch (e) { } }
                /* 已受控页面会在 controllerchange 时由 boot.js 自动刷新；
                   这里再兜一次，防止个别浏览器不发该事件 */
                setTimeout(function () {
                  if (navigator.serviceWorker.controller) reloadOnce();
                  else setTimeout(reloadOnce, 600);
                }, 900);
                return;
              }
              if (st === 'none') {
                if (newer) { say('正在应用 v' + remote + '…'); setTimeout(reloadOnce, 600); }
                else { say('已是最新（v' + VER.web + '）'); UI.toast('已是最新版本'); }
                done(); return;
              }
              say('下载时间较长，可稍后自动切换；也可点「强制刷新」');
              done();
            });
        });
      })
      .catch(function (e) { say('检查失败（' + (e && e.message ? e.message : '离线或不支持') + '）'); done(); });
  }

  function exportAll() {
    var blob = new Blob([JSON.stringify({ app: 'yaoli', version: VER.app, ts: Date.now(), data: Z.store }, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '药理学备份_' + Z.nowText().replace(/[: ]/g, '-') + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    UI.toast('已导出');
  }
  function importAll() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var o = JSON.parse(fr.result), data = o.data || o;
          Object.keys(Z.store).forEach(function (k) { delete Z.store[k]; });
          Object.keys(data).forEach(function (k) { Z.store[k] = data[k]; });
          Z.save(true); UI.toast('导入成功'); setTimeout(function () { location.reload(); }, 700);
        } catch (e) { UI.dialog({ title: '导入失败', text: '文件不是本应用的备份。' }); }
      };
      fr.readAsText(f);
    };
    inp.click();
  }

  function renderAbout(main) {
    UI.header({ title: '关于', back: true });
    var ms = Z.MAT.stats, ks = Z.KP.stats, qs = Z.QZ.stats;
    var cards = ms.drugs + ms.topics;
    main.innerHTML = '<div class="card"><h3 class="serif" style="margin:0 0 10px">药理学 · 学习工具</h3>' +
      '<p class="small" style="line-height:1.75">内容基于《药理学》教材整理稿与《学习指导与习题集》整理稿。' +
      '仅供学习使用，不提供临床用药指导。' +
      '教材卡片：' + ms.parts + ' 篇 ' + ms.chapters + ' 章 ' + cards + ' 张卡（药物 ' + ms.drugs + '、概念 ' + ms.topics + '），'
      '另有 ' + (ms.intro || 0) + ' 张章/节概述卡（同样可收藏、笔记、编辑）。' +
      '知识要点：' + ks.chapters + ' 章 ' + ks.items + ' 条，含导图 ' + ks.images + ' 张、表格 ' + ks.tables + ' 个。' +
      '自测题：' + qs.questions + ' 题（单选 ' + qs.A1 + ' / 配伍 ' + qs.B1 + ' / 多选 ' + qs.X + ' / 名词 ' + qs.NM + ' / 问答 ' + qs.QA + '）。' +
      '说明：教材篇目从第二篇第四章起（原书第一篇总论未收入提取稿）；'
      '第三十五章自测题原提取稿缺失，已按扫描原书逐题补录；'
      '第七章第 3 题问答题答案原书缺失。</p></div>';
  }

  function renderTip(main) {
    UI.header({ title: '赞赏支持', back: true });
    main.innerHTML = '<div class="card tip-card"><p class="tip-t serif">制作不易，如果觉得有用的话，可以给作者一点赞赏嘛，多少都是可以的，一块钱也是爱，' +
      '当然没有打赏也是可以的，支持分享，支持白嫖，大家都是医学生，不必为难</p>' +
      '<div class="qr-wrap"><img src="qr.jpg" alt="赞赏码" class="qr-img"></div><p class="tiny dim center">微信 / 支付宝 扫码 · 完全自愿</p></div>';
  }

  UI.VIEWS.home = renderHome;
  UI.VIEWS.fav = renderFav;
  UI.VIEWS.search = renderSearch;
  UI.VIEWS.me = renderMe;
  UI.VIEWS.about = renderAbout;
  UI.VIEWS.tip = renderTip;
})();
