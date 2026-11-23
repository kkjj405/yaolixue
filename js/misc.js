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
          return '<div class="er" style="cursor:default"><a class="er-nm" href="#/entry/' + id + '" style="text-decoration:none;color:inherit">' +
            esc(e.name) + '<span class="tiny dim"> ' + esc(ch ? ch.no : '') + '</span></a>' +
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
      '<span class="li-s" id="upd-msg">点右侧按钮检查</span></span><button class="btn xs" id="upd-btn">检查</button></div>' +
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
  function checkUpdate(main) {
    var msg = main.querySelector('#upd-msg');
    function say(t) { if (msg) msg.textContent = t; }
    say('正在检查…');
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var remote = j.web || '';
        if (cmp(remote, VER.web) > 0) {
          say('发现 v' + remote + '，更新中…');
          if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
            navigator.serviceWorker.getRegistration().then(function (reg) { if (reg) reg.update(); });
          }
          setTimeout(function () { location.reload(); }, 1200);
        } else { say('已是最新（v' + VER.web + '）'); UI.toast('已是最新版本'); }
      })
      .catch(function () { say('检查失败（离线或不支持）'); });
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
      '教材卡片：' + ms.parts + ' 篇 ' + ms.chapters + ' 章 ' + cards + ' 张卡（药物 ' + ms.drugs + '、概念 ' + ms.topics + '）。' +
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
