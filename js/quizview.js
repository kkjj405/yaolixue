/* 药理学 · 刷题
   1:1 复刻「阶段考」(zcmu-stage-exam) 的刷题结构与交互：
   目录（章）→ 题型 → 答题卡（按题型分段 / 状态色 / 点击跳题 / 每题与题型重做）→ 逐题作答
   状态码 ST：0 未做 / 1 正确 / 2 错误 / 3 已掌握 / 4 待提交（文字题已交、待自评）
   全部题目单题提交、立即判对错并给出正确答案，没有整卷提交。 */
(function () {
  'use strict';
  var Z = window.YL, UI = window.YL_UI;
  if (!Z || !UI) return;
  var esc = Z.esc, icon = UI.icon;
  function qsa(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function pct(a, b) { return b ? Math.round(a * 100 / b) : 0; }

  /* ---------------- 常量（对齐阶段考 ST / MODES） ---------------- */
  var ST = { NONE: 0, RIGHT: 1, WRONG: 2, SKIP: 3, PENDING: 4 };
  var TYPE_ORDER = ['A1', 'B1', 'X', 'NM', 'QA'];
  /* 需求：A1 显示为「单选」（不再出现旧称） */
  var TYPE = {
    A1: { name: '单选题', short: '单选', tag: 'A1' },
    B1: { name: '配伍选择题', short: '配伍', tag: 'B1' },
    X: { name: '多项选择题', short: '多选', tag: 'X' },
    NM: { name: '名词解释', short: '名词', tag: 'NM' },
    QA: { name: '问答题', short: '问答', tag: 'QA' }
  };
  var MODES = [
    { k: 0, name: '练习', desc: '即时判对错' },
    { k: 1, name: '快刷', desc: '答对自动跳' },
    { k: 3, name: '背题', desc: '直接看答案' }
  ];
  var FILTER_LABEL = { all: '', wrong: '错题', fav: '收藏', note: '笔记' };
  var FILTER_CARD = { wrong: '错题答题卡', fav: '收藏答题卡', note: '笔记答题卡' };

  /* ---------------- 题库索引 ---------------- */
  var byType = {};
  (Z.QZ.questions || []).forEach(function (q) {
    var k = q.chapterId + '/' + q.type;
    (byType[k] = byType[k] || []).push(q);
  });
  function chapterOf(cid) {
    return (Z.QZ.chapters || []).filter(function (c) { return c.id === cid; })[0];
  }
  function qsOf(cid, t) { return byType[cid + '/' + t] || []; }
  function typesOf(ch) {
    var have = {};
    (ch.types || []).forEach(function (t) { have[t.t] = 1; });
    return TYPE_ORDER.filter(function (t) { return have[t]; });
  }
  function typeName(t) { return (TYPE[t] || {}).name || t; }
  function typeShort(t) { return (TYPE[t] || {}).short || t; }
  function isChoice(q) { return Z.isChoice(q); }
  function optsOf(q) { return Z.optionsOf(q); }
  function answerOf(q) {
    var out = [];
    (q.answer || []).forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
    return out;
  }
  function answerTextOf(q) {
    return (q.answerText && String(q.answerText).trim()) ? q.answerText : '（原书未给出参考答案，可对照课本自行核对）';
  }

  /* ---------------- 做题痕迹（阶段考 S.rec 的等价物，落盘在 Z.store.rec） ---------------- */
  /* 记录：{ c: 选择(数组)/文字, st: 0..4, n: 作答次数, r: 答对次数, w: 答错次数 } */
  function recOf(id) {
    var r = Z.store.rec[id];
    if (!r) return null;
    if (r.st == null) r.st = r.s === 1 ? ST.RIGHT : (r.s === 0 ? ST.WRONG : ST.NONE);
    return r;
  }
  function stOf(id) { var r = recOf(id); return r ? r.st : ST.NONE; }
  function writeRec(id, c, st, inc) {
    var old = Z.store.rec[id] || {};
    var n = old.n || 0, r = old.r || 0, w = old.w || 0;
    if (inc) {
      n++;
      if (st === ST.RIGHT) r++;
      else if (st === ST.WRONG) w++;
    }
    Z.store.rec[id] = { c: c, st: st, n: n, r: r, w: w, ts: Date.now() };
    if (st === ST.RIGHT) delete Z.store.wrong[id];
    else if (st === ST.WRONG) Z.store.wrong[id] = (Z.store.wrong[id] || 0) + 1;
    else delete Z.store.wrong[id];
    Z.save(true);
  }
  function selfEval(id, ok) {
    var r = Z.store.rec[id];
    if (!r) return;
    var prev = r.st;
    if (prev === ST.RIGHT && !ok) { r.r = Math.max(0, (r.r || 0) - 1); r.w = (r.w || 0) + 1; }
    else if (prev === ST.WRONG && ok) { r.w = Math.max(0, (r.w || 0) - 1); r.r = (r.r || 0) + 1; }
    else if (prev !== ST.RIGHT && prev !== ST.WRONG) { if (ok) r.r = (r.r || 0) + 1; else r.w = (r.w || 0) + 1; }
    r.st = ok ? ST.RIGHT : ST.WRONG;
    r.ts = Date.now();
    if (ok) delete Z.store.wrong[id];
    else Z.store.wrong[id] = (Z.store.wrong[id] || 0) + 1;
    Z.save(true);
  }
  /* 已掌握（阶段考 ST.SKIP）：覆盖显示状态，但保留原作答痕迹（比参考实现更不丢痕迹） */
  function toggleMastered(id) {
    var r = recOf(id);
    if (!r) return false;
    if (r.st === ST.SKIP) {
      r.st = (r.prevSt === ST.RIGHT || r.prevSt === ST.WRONG) ? r.prevSt : ST.NONE;
      delete r.prevSt;
      if (r.st === ST.WRONG) Z.store.wrong[id] = (Z.store.wrong[id] || 0) + 1;
      else delete Z.store.wrong[id];
    } else {
      r.prevSt = r.st;
      r.st = ST.SKIP;
      delete Z.store.wrong[id];
    }
    r.ts = Date.now();
    Z.save(true);
    return r.st === ST.SKIP;
  }
  /* 每题重做：清空本题作答痕迹（答题卡回到未做），保留历史次数统计 */
  function clearQuestion(id) {
    var r = Z.store.rec[id];
    if (!r) return false;
    r.c = null; r.st = ST.NONE; r.ts = Date.now();
    delete r.prevSt;
    delete Z.store.wrong[id];
    Z.save(true);
    return true;
  }
  /* 题型批量重做：清空某章某题型（或当前筛选集合）的作答痕迹，保留历史统计 */
  function clearType(cid, t, f) {
    var n = 0;
    listOf(cid, t, f || 'all').forEach(function (q) {
      var r = Z.store.rec[q.id];
      if (r && (r.st !== ST.NONE || r.c != null)) {
        r.c = null; r.st = ST.NONE;
        delete r.prevSt;
        delete Z.store.wrong[q.id];
        n++;
      }
    });
    Z.save(true);
    return n;
  }
  function statText(r) {
    if (!r || !r.n) return '本题还未作答';
    return '已做 ' + r.n + ' 次 · 答对 ' + (r.r || 0) + ' 次 · 答错 ' + (r.w || 0) + ' 次';
  }

  /* ---------------- 练习模式（对齐阶段考「练习 / 快刷 / 背题」，不做整卷提交模式） ---------------- */
  function mode() {
    var m = Z.store.sessions.mode;
    return (m === 1 || m === 3) ? m : 0;
  }
  function modeName() {
    var k = mode();
    for (var i = 0; i < MODES.length; i++) if (MODES[i].k === k) return MODES[i].name;
    return '练习';
  }
  function setMode(k) { Z.store.sessions.mode = k; Z.save(true); }

  /* ---------------- 当前答题会话（#/qrun） ---------------- */
  function sess() {
    var s = Z.store.sessions.cur;
    return (s && s.cid && s.type) ? s : null;
  }
  function saveSess(s) { Z.store.sessions.cur = s; Z.save(); }
  function posKey(cid, t) { return cid + '/' + t; }
  function lastPos(cid, t) {
    var pos = Z.store.sessions.pos || {};
    var v = pos[posKey(cid, t)];
    return (typeof v === 'number' && v >= 0) ? v : 0;
  }
  function setLastPos(cid, t, idx) {
    var pos = Z.store.sessions.pos || (Z.store.sessions.pos = {});
    pos[posKey(cid, t)] = idx;
    Z.save();
  }
  function listOf(cid, t, f) {
    var list = qsOf(cid, t);
    if (!f || f === 'all') return list;
    return list.filter(function (q) {
      if (f === 'wrong') return stOf(q.id) === ST.WRONG;
      if (f === 'fav') return !!Z.store.qfav[q.id];
      if (f === 'note') return !!(Z.store.qnotes[q.id] || '').trim();
      return true;
    });
  }
  function statOf(cid, t, f) {
    var s = { n: 0, done: 0, right: 0, wrong: 0, skip: 0, pending: 0 };
    listOf(cid, t, f).forEach(function (q) {
      s.n++;
      var st = stOf(q.id);
      if (st === ST.RIGHT) { s.right++; s.done++; }
      else if (st === ST.WRONG) { s.wrong++; s.done++; }
      else if (st === ST.SKIP) s.skip++;
      else if (st === ST.PENDING) { s.pending++; s.done++; }
    });
    return s;
  }
  function chapterStat(cid) {
    var s = { n: 0, done: 0, right: 0, wrong: 0 };
    typeListOf(cid).forEach(function (t) {
      var o = statOf(cid, t, 'all');
      s.n += o.n; s.done += o.done; s.right += o.right; s.wrong += o.wrong;
    });
    return s;
  }
  function typeListOf(cid) { var ch = chapterOf(cid); return ch ? typesOf(ch) : []; }
  function startRun(cid, t, f, idx) {
    var list = listOf(cid, t, f || 'all');
    if (!list.length) { UI.toast('这个集合里还没有题目'); return; }
    var ff = f || 'all';
    var pos;
    if (typeof idx === 'number' && idx >= 0) pos = idx;
    else {
      var cs = sess();
      if (cs && cs.cid === cid && cs.type === t && (cs.filter || 'all') === ff) pos = cs.idx;
      else pos = lastPos(cid, t);
    }
    if (pos >= list.length) pos = 0;
    if (pos < 0) pos = 0;
    if (ff === 'all') setLastPos(cid, t, pos);
    var s = { cid: cid, type: t, filter: ff, idx: pos, ts: Date.now() };
    saveSess(s);
    Z.save(true);
    noteOpen = false; noteDraft = null;
    UI.go('#/qrun');
  }
  function cardHash(cid, t, f) {
    var h = '#/qcard/' + cid;
    if (t) h += '?t=' + t;
    if (f && f !== 'all') h += (t ? '&' : '?') + 'f=' + f;
    return h;
  }
  function wrongN() {
    return Object.keys(Z.store.rec).filter(function (id) { return Z.qBy[id] && stOf(id) === ST.WRONG; }).length;
  }
  function favN() {
    return Object.keys(Z.store.qfav).filter(function (id) { return Z.qBy[id]; }).length;
  }
  function noteN() {
    return Object.keys(Z.store.qnotes).filter(function (id) { return Z.qBy[id] && String(Z.store.qnotes[id] || '').trim(); }).length;
  }
  function noteOf(id) { return Z.store.qnotes[id] || ''; }

  var noteOpen = false, noteDraft = null;

  /* =========================================================
     1. 目录（阶段考 viewBanks / viewCourses 的层级：章 = 课程）
     ========================================================= */
  function renderHome(main) {
    var st = Z.QZ.stats || {};
    UI.header({ title: '刷题', sub: (st.questions || Z.qList.length) + ' 题 · ' + (st.chapters || Z.QZ.chapters.length) + ' 章' });
    var h = [];
    h.push('<div class="qz-entries">' +
      entryRow('#/qwrong?seg=wrong', '错题本', wrongN() + ' 题', 'refresh') +
      entryRow('#/qwrong?seg=fav', '我的收藏', favN() + ' 题', 'star') +
      entryRow('#/qwrong?seg=note', '我的笔记', noteN() + ' 题', 'note') +
      '</div>');
    h.push('<div class="qz-h2">选择章节</div>');
    (Z.QZ.chapters || []).forEach(function (c) {
      var cs = chapterStat(c.id);
      var p = pct(cs.done, cs.n);
      var types = typesOf(c);
      h.push('<a class="card qz-chap" href="#/qtypes/' + c.id + '" data-chapter="' + c.id + '">' +
        '<div class="row"><div class="grow"><div class="qz-chap-t">' + esc(c.no + ' ' + c.name) + '</div>' +
        '<div class="qz-chap-s">' + types.length + ' 个题型 · ' + cs.n + ' 题</div></div>' +
        '<span class="qz-chev">›</span></div>' +
        '<div class="qz-nums"><span>已做 <b>' + cs.done + '</b></span>' +
        '<span>正确率 <b>' + pct(cs.right, cs.right + cs.wrong) + '%</b></span>' +
        '<span>进度 <b>' + p + '%</b></span></div>' +
        '<div class="qz-pb"><i style="width:' + p + '%"></i></div></a>');
    });
    h.push('<div class="qz-muted qz-center">共 ' + (st.questions || Z.qList.length) + ' 道题 · 完全离线可用</div>');
    main.innerHTML = h.join('');
  }
  function entryRow(href, name, sub, ic) {
    return '<a class="qz-entry" href="' + href + '">' + icon(ic) +
      '<span class="qz-entry-t">' + esc(name) + '</span>' +
      '<em class="qz-entry-s">' + esc(sub) + '</em><span class="qz-chev">›</span></a>';
  }

  /* =========================================================
     2. 题型页（阶段考 viewTypes：题型行 + 练习模式）
     ========================================================= */
  function renderTypes(main, p) {
    var cid = p[0], ch = chapterOf(cid);
    if (!ch) { UI.header({ title: '刷题', back: true, backTo: '#/quiz' }); main.innerHTML = UI.emptyBox('章节不存在'); return; }
    UI.header({ title: ch.name, sub: ch.no + ' · 选择题型', back: true, backTo: '#/quiz' });
    var h = ['<div class="qz-h2">题型</div><div class="card qz-tlist">'];
    typesOf(ch).forEach(function (t) {
      var s = statOf(cid, t, 'all'), pr = pct(s.done, s.n);
      h.push('<div class="qz-trow" data-type="' + t + '">' +
        '<span class="qz-tag t-' + t.toLowerCase() + '">' + TYPE[t].tag + '</span>' +
        '<div class="grow"><div class="qz-tname">' + typeName(t) + '</div>' +
        '<div class="qz-tsub">' + s.n + ' 题 · 已做 ' + s.done + ' · 正确率 ' + pct(s.right, s.right + s.wrong) + '%</div>' +
        '<div class="qz-pb thin"><i style="width:' + pr + '%"></i></div></div>' +
        '<div class="qz-tn">' + pr + '%<br><span class="qz-chev">›</span></div></div>');
    });
    h.push('</div>');
    h.push('<div class="qz-h2">练习模式</div><div class="card"><div class="qz-modes">' +
      MODES.map(function (m) {
        return '<button class="qz-mode' + (mode() === m.k ? ' on' : '') + '" data-mode="' + m.k + '">' +
          '<b>' + m.name + '</b><span>' + m.desc + '</span></button>';
      }).join('') + '</div></div>');
    h.push('<div class="qz-hint">' + icon('pen') + '<span>点击题型先进入答题卡，再选择「开始/继续本题型」或「重做本题型」。</span></div>');
    main.innerHTML = h.join('');
    qsa(main, '[data-type]').forEach(function (b) {
      b.onclick = function () { UI.go('#/qcard/' + cid + '?t=' + b.getAttribute('data-type')); };
    });
    qsa(main, '[data-mode]').forEach(function (b) {
      b.onclick = function () {
        var k = parseInt(b.getAttribute('data-mode'), 10);
        if (mode() === k) return;
        setMode(k);
        // 阶段考：模式切换仅高亮并保存，不跳转
        qsa(main, '.qz-mode').forEach(function (x) { x.classList.toggle('on', x === b); });
        UI.toast('已切换为「' + modeName() + '」模式');
      };
    });
  }

  /* =========================================================
     3. 答题卡（阶段考 viewGrid：顶部操作条 + 统计 + 数字格 + 图例）
        需求：按题型分段；每个题型行放「重做本题型」
     ========================================================= */
  /* 自定义批量重做：选择模式（开关 + 选中集），跨题型、只对已作答的题生效 */
  var selMode = { cid: '', on: false, ids: {} };
  function renderCard(main, p, q) {
    var cid = p[0], ch = chapterOf(cid);
    if (!ch) { UI.header({ title: '答题卡', back: true, backTo: '#/quiz' }); main.innerHTML = UI.emptyBox('章节不存在'); return; }
    if (selMode.cid !== cid) selMode = { cid: cid, on: false, ids: {} };
    var t = q.t || '';
    var f = q.f || 'all';
    if (f !== 'all' && !t) f = 'all';
    /* 全部题型都展示成分段：每个题型行都有自己的「重做本题型」；
       ?t= 仅用于聚焦/滚动到指定题型。筛选答题卡（错题/收藏/笔记）只显示该题型。 */
    var secs = typesOf(ch).filter(function (x) { return qsOf(cid, x).length; });
    if (f !== 'all') secs = secs.filter(function (x) { return x === t; });
    if (!secs.length) { UI.header({ title: '答题卡', back: true, backTo: '#/qtypes/' + cid }); main.innerHTML = UI.emptyBox('本章还没有题目'); return; }
    var filterTitle = f !== 'all' ? FILTER_CARD[f] : '';
    var sub = ch.no + ' ' + ch.name + (t ? ' · ' + typeName(t) : '');
    var back = f !== 'all' ? '#/qwrong?seg=' + f : '#/qtypes/' + cid;
    UI.header({ title: filterTitle || '答题卡', sub: sub, back: true, backTo: back });

    /* 当前焦点题型：?t 指定，否则取第一个 */
    var focusT = t || secs[0];
    var focusList = listOf(cid, focusT, f);

    var h = [];
    h.push('<div class="qz-gbar">' +
      '<button class="btn sm primary qz-gbtn" id="gStart">' + (focusList.length ? '开始 / 继续答题' : '本题型没有题目') + '</button>' +
      '<button class="btn sm qz-gbtn2" id="gSel">自定义重做</button>' +
      '</div>');

    /* 汇总统计（对齐阶段考 gstats：已做 / 正确 / 错误 / 正确率） */
    var T = { n: 0, done: 0, right: 0, wrong: 0, skip: 0, pending: 0 };
    secs.forEach(function (x) {
      var o = statOf(cid, x, f);
      T.n += o.n; T.done += o.done; T.right += o.right; T.wrong += o.wrong; T.skip += o.skip; T.pending += o.pending;
    });
    h.push('<div class="qz-gridwrap">');
    h.push('<div class="qz-ghead">' + esc(filterTitle || (ch.no + ' ' + ch.name)) + ' · 共 ' + T.n + ' 题</div>');
    h.push('<div class="qz-gstats">' +
      '<div class="qz-gstat"><b>' + T.done + '</b><span>已做</span></div>' +
      '<div class="qz-gstat"><b class="ok">' + T.right + '</b><span>正确</span></div>' +
      '<div class="qz-gstat"><b class="bad">' + T.wrong + '</b><span>错误</span></div>' +
      '<div class="qz-gstat"><b>' + pct(T.right, T.right + T.wrong) + '%</b><span>正确率</span></div>' +
      '</div>');

    var curS = sess();
    var curQid = '';
    if (curS && curS.cid === cid && secs.indexOf(curS.type) >= 0) {
      var curList = listOf(curS.cid, curS.type, curS.filter);
      var cq = curList[curS.idx];
      if (cq) curQid = cq.id;
    }
    secs.forEach(function (x) {
      var list = listOf(cid, x, f);
      var s = statOf(cid, x, f);
      var pr = pct(s.done, s.n);
      h.push('<div class="qz-gsec' + (t === x ? ' focus' : '') + '" data-sec="' + x + '">');
      h.push('<div class="qz-gsec-hd">' +
        '<span class="qz-tag t-' + x.toLowerCase() + '">' + TYPE[x].tag + '</span>' +
        '<div class="grow"><div class="qz-gsec-t">' + typeName(x) + '</div>' +
        '<div class="qz-gsec-s">' + s.n + ' 题 · 已做 ' + s.done + ' · 对 ' + s.right + ' · 正确率 ' + pct(s.right, s.right + s.wrong) + '%</div>' +
        '<div class="qz-pb thin"><i style="width:' + pr + '%"></i></div></div>' +
        '<div class="qz-gsec-n">' + pr + '%</div></div>');
      h.push('<div class="qz-grid">' + list.map(function (qq, pos) {
        var st = stOf(qq.id);
        var cls = 'qz-cell';
        if (st === ST.RIGHT) cls += ' s1';
        else if (st === ST.WRONG) cls += ' s2';
        else if (st === ST.SKIP) cls += ' s3';
        else if (st === ST.PENDING) cls += ' s4';
        if (noteOf(qq.id).trim()) cls += ' hasnote';
        if (curQid && curQid === qq.id) cls += ' cur';
        return '<button class="' + cls + '" data-i="' + pos + '" data-qid="' + qq.id + '">' + (pos + 1) + '</button>';
      }).join('') + '</div>');
      h.push('<div class="qz-gsec-act">' +
        '<button class="btn sm primary" data-start="' + x + '">开始 / 继续本题型</button>' +
        '<button class="btn sm" data-redo="' + x + '">重做本题型（' + s.done + ' 题已做）</button>' +
        '</div>');
      h.push('</div>');
    });
    h.push('<div class="qz-legend">' +
      '<span><i class="qz-lg none"></i>未做</span>' +
      '<span><i class="qz-lg s1"></i>正确</span>' +
      '<span><i class="qz-lg s2"></i>错误</span>' +
      '<span><i class="qz-lg s3"></i>已掌握</span>' +
      '<span><i class="qz-lg s4"></i>待提交</span>' +
      '<span><i class="qz-lg cur"></i>当前题</span>' +
      '<span><i class="qz-lg hasnote"></i>右上角小蓝点 = 有笔记</span>' +
      '</div>');
    h.push('</div>');
    /* 选择模式的底部操作条（默认隐藏） */
    h.push('<div class="qz-selbar" id="selbar">' +
      '<span class="qz-seln">已选 <b id="seln">0</b> 题</span>' +
      '<button class="btn sm" id="selAll">全选已做</button>' +
      '<button class="btn sm primary" id="selDo">重做所选</button>' +
      '<button class="btn sm ghost" id="selCancel">取消</button></div>');
    main.innerHTML = h.join('');

    function refresh() { UI.render(); }
    var gs = main.querySelector('#gStart');
    if (gs) gs.onclick = function () { startRun(cid, focusT, f); };
    qsa(main, '[data-start]').forEach(function (b) {
      b.onclick = function () { startRun(cid, b.getAttribute('data-start'), f); };
    });
    qsa(main, '[data-redo]').forEach(function (b) {
      b.onclick = function () {
        var tt = b.getAttribute('data-redo');
        var s = statOf(cid, tt, f);
        UI.confirmDialog('重做本题型',
          '将清除「' + typeName(tt) + '」已做的 ' + s.done + ' 题痕迹，答题卡回到「未做」，可重新作答。' +
          '历史作答次数与对错统计会保留。确定重做？', '重做', '取消').then(function (ok) {
            if (!ok) return;
            var n = clearType(cid, tt, f);
            UI.toast(n ? ('已清空 ' + n + ' 题，可重新作答') : '本题型还没有作答记录');
            refresh();
          });
      };
    });
    qsa(main, '.qz-cell').forEach(function (b) {
      b.onclick = function () {
        if (selMode.on) { toggleCell(b); return; }
        var i = parseInt(b.getAttribute('data-i'), 10);
        var sec = b.closest ? b.closest('.qz-gsec') : null;
        var tt = sec ? sec.getAttribute('data-sec') : focusT;
        startRun(cid, tt, f, i);
      };
    });
    /* ---- 自定义批量重做 ---- */
    function selCount() { return Object.keys(selMode.ids).length; }
    function syncBar() {
      var el = main.querySelector('#seln'); if (el) el.textContent = String(selCount());
      var bar = main.querySelector('#selbar'); if (bar) bar.classList.toggle('on', selMode.on);
      var g = main.querySelector('#gSel'); if (g) g.textContent = selMode.on ? '退出选择' : '自定义重做';
      main.classList.toggle('sel-on', selMode.on);
    }
    function toggleCell(b) {
      var qid = b.getAttribute('data-qid');
      if (stOf(qid) === ST.NONE) { UI.toast('这题还没作答，不用重做'); return; }
      if (selMode.ids[qid]) { delete selMode.ids[qid]; b.classList.remove('sel'); }
      else { selMode.ids[qid] = 1; b.classList.add('sel'); }
      syncBar();
    }
    function exitSel() {
      selMode.on = false; selMode.ids = {};
      qsa(main, '.qz-cell.sel').forEach(function (b) { b.classList.remove('sel'); });
      syncBar();
    }
    var gsel = main.querySelector('#gSel');
    if (gsel) gsel.onclick = function () {
      selMode.on = !selMode.on;
      selMode.ids = {};
      qsa(main, '.qz-cell.sel').forEach(function (b) { b.classList.remove('sel'); });
      syncBar();
      if (selMode.on) UI.toast('点题目格选择要重做的题');
    };
    var selAll = main.querySelector('#selAll');
    if (selAll) selAll.onclick = function () {
      qsa(main, '.qz-cell').forEach(function (b) {
        if (stOf(b.getAttribute('data-qid')) === ST.NONE) return;
        selMode.ids[b.getAttribute('data-qid')] = 1; b.classList.add('sel');
      });
      syncBar();
    };
    var selDo = main.querySelector('#selDo');
    if (selDo) selDo.onclick = function () {
      var ids = Object.keys(selMode.ids);
      if (!ids.length) { UI.toast('先点选要重做的题'); return; }
      UI.confirmDialog('重做所选题目',
        '将清除所选 ' + ids.length + ' 题的作答痕迹（选择/判定/错题记录），回到「未做」，可重新作答。' +
        '历史作答次数与对错统计会保留。确定重做？', '重做', '取消').then(function (ok2) {
          if (!ok2) return;
          var done = 0;
          ids.forEach(function (qid) { if (clearQuestion(qid)) done++; });
          selMode.on = false; selMode.ids = {};
          UI.toast(done ? ('已清空 ' + done + ' 题，可重新作答') : '所选题目没有作答记录');
          UI.render();
        });
    };
    var selCancel = main.querySelector('#selCancel');
    if (selCancel) selCancel.onclick = exitSel;
    syncBar();

    /* 从题型入口进入时，把该题型段滚到可见位置 */
    if (t) {
      setTimeout(function () {
        var sec = main.querySelector('[data-sec="' + t + '"]');
        if (sec && sec.scrollIntoView) sec.scrollIntoView({ block: 'start' });
      }, 30);
    }
  }

  /* =========================================================
     4. 答题页（阶段考 viewQuiz：qstat / qhead / 题目 / 解析 / 工具条 / 底部条）
     ========================================================= */
  function renderRun(main) {
    var s = sess();
    if (!s) {
      UI.header({ title: '刷题', back: true, backTo: '#/quiz' });
      main.innerHTML = UI.emptyBox('还没有开始的题目', '去「刷题 → 章节 → 题型 → 答题卡」选一组开始') +
        '<div class="qz-center"><a class="btn sm primary" href="#/quiz">回到刷题目录</a></div>';
      return;
    }
    var ch = chapterOf(s.cid), qs = listOf(s.cid, s.type, s.filter);
    if (!ch || !qs.length) {
      var backH = cardHash(s.cid, s.type, s.filter);
      UI.header({ title: '答题卡', back: true, backTo: backH });
      main.innerHTML = UI.emptyBox('这个集合里已经没有题目了', '可以回到答题卡切换题型或重做');
      return;
    }
    if (s.idx < 0 || s.idx >= qs.length) s.idx = 0;
    var q = qs[s.idx], qid = q.id;
    var r = recOf(qid);
    var st = r ? r.st : ST.NONE;
    var m = mode();
    var answered = st === ST.RIGHT || st === ST.WRONG || st === ST.SKIP || st === ST.PENDING;
    var reveal = m === 3 || answered;
    var answer = answerOf(q);
    var choice = isChoice(q);
    var opts = optsOf(q);
    var chosen = (r && r.c != null && typeof r.c === 'object') ? r.c : [];
    var draftSel = (s.sel && s.sel[qid]) || [];
    var sel = chosen.length ? chosen : draftSel;
    var note = noteOf(qid);
    var backTo = cardHash(s.cid, s.type, s.filter);

    UI.header({
      title: '第 ' + (s.idx + 1) + ' / ' + qs.length + ' 题',
      sub: ch.name + ' · ' + typeName(s.type) + ' · ' + modeName() + (s.filter !== 'all' ? ' · ' + FILTER_LABEL[s.filter] : ''),
      back: true, backTo: backTo,
      actions: [{ icon: 'grid', text: '答题卡', onClick: function () { UI.go(backTo); } }]
    });

    var h = [];
    h.push('<div class="qz-stat">' + icon('refresh') + '<span>' + esc(statText(r)) + '</span>' +
      (note ? '<span class="qz-ntag">' + icon('pen') + '有笔记</span>' : '') + '</div>');
    h.push('<div class="qz-qhead"><span class="qz-idx">第 <b>' + (s.idx + 1) + '</b> / ' + qs.length + ' 题</span>' +
      '<span>' + TYPE[s.type].tag + ' 型 · ' + modeName() +
      (s.filter !== 'all' ? ' · ' + FILTER_LABEL[s.filter] : '') + '</span></div>');
    h.push('<div class="qz-pb thin"><i style="width:' + pct(s.idx + 1, qs.length) + '%"></i></div>');

    h.push('<div class="qz-qbody">');
    h.push('<div class="qz-qstem">' + esc(q.stem) + '</div>');

    if (choice) {
      if (!opts.length) {
        h.push('<div class="qz-warn">本题选项数据缺失，暂无法作答。</div>');
        if (revealMissing[qid] || reveal) {
          h.push('<div class="qz-ansline">正确答案：' + (answer.join('') || '（缺失）') + '</div>');
        } else {
          h.push('<button class="btn sm" id="q-reveal">查看正确答案</button>');
        }
      } else {
        if (q.type === 'B1' && q.sharedLabel) h.push('<div class="qz-shared">' + esc(q.sharedLabel) + '</div>');
        h.push('<div class="qz-opts">');
        opts.forEach(function (o, i) {
          var picked = sel.indexOf(o.k) >= 0;
          var cls = 'qz-opt';
          if (reveal) {
            if (answer.indexOf(o.k) >= 0) cls += ' right';
            else if (picked) cls += ' wrong';
            else cls += ' dim';
          } else if (picked) cls += ' sel';
          h.push('<button class="' + cls + '" data-opt="' + esc(o.k) + '"' +
            (answered ? ' disabled' : '') + '>' +
            '<span class="qz-k">' + esc(o.k) + '</span><span class="qz-v">' + esc(o.t) + '</span></button>');
        });
        h.push('</div>');
        if (!answered) {
          if (q.type === 'X') {
            h.push('<div class="qz-submit-row"><button class="btn sm primary" id="q-submit"' +
              (draftSel.length ? '' : ' disabled') + '>提交本题</button>' +
              '<span class="qz-tip">可多选，选完提交</span></div>');
          } else if (!answer.length) {
            h.push('<div class="qz-warn">本题参考答案缺失，暂无法判分。</div>');
          } else {
            h.push('<div class="qz-tip">点选项即判对错</div>');
          }
        }
      }
    } else {
      /* 名词解释 / 问答题：答题框 → 提交 → 显示参考答案 → 自评（需求 3） */
      if (m !== 3 && !answered) {
        var draft = (s.drafts && s.drafts[qid]) || '';
        h.push('<div class="qz-ansinput"><textarea class="qz-ta" id="qa-txt" placeholder="' +
          (q.type === 'NM' ? '输入你的名词解释…' : '输入你的答案（要点即可）…') + '">' + esc(draft) + '</textarea></div>');
        h.push('<div class="qz-submit-row"><button class="btn sm primary" id="q-submit">提交本题</button>' +
          '<span class="qz-tip">提交后显示参考答案，自己评分</span></div>');
      }
    }

    /* 判定结果 / 正确答案 / 参考答案 */
    if (reveal || m === 3) {
      if (choice && opts.length) {
        var ansText = answer.map(function (k) {
          for (var i = 0; i < opts.length; i++) if (opts[i].k === k) return k + '. ' + opts[i].t;
          return k;
        }).join('；');
        h.push('<div class="qz-explain">' +
          '<div class="qz-explain-h">结果与答案</div>' +
          (answered && st !== ST.SKIP ? '<div class="qz-res ' + (st === ST.RIGHT ? 'ok' : st === ST.WRONG ? 'bad' : 'pending') + '">' +
            (st === ST.RIGHT ? '✓ 答对了' : st === ST.WRONG ? '✗ 答错了' : '待自评') + '</div>' :
            (st === ST.SKIP ? '<div class="qz-res skip">✓ 已掌握</div>' : '')) +
          '<div class="qz-ansline">正确答案：' + esc(ansText) + '</div>' +
          (st === ST.WRONG && chosen.length ? '<div class="qz-meta bad">你的答案：' + esc(chosen.join('')) + '</div>' : '') +
          '<div class="qz-meta">' + esc(ch.name) + ' · ' + typeName(s.type) + ' · 本题型第 ' + (q.no || (s.idx + 1)) + ' 题</div>' +
          '</div>');
      } else if (!choice) {
        h.push('<div class="qz-explain">' +
          '<div class="qz-explain-h">结果与答案</div>' +
          (answered ? '<div class="qz-res ' + (st === ST.RIGHT ? 'ok' : st === ST.WRONG ? 'bad' : 'pending') + '">' +
            (st === ST.RIGHT ? '✓ 答对了' : st === ST.WRONG ? '✗ 答错了' : '待自评：请对照参考答案给自己评分') + '</div>' : '') +
          '<div class="qz-ansbox"><div class="qz-ansh">参考答案</div><div class="qz-anst">' +
          esc(answerTextOf(q)) + '</div></div>');
        if (st !== ST.NONE && m !== 3) {
          var myAns = (r && typeof r.c === 'string') ? r.c : ((s.drafts && s.drafts[qid]) || '');
          if (myAns) h.push('<div class="qz-myans"><div class="qz-myans-h">我的答案</div><div class="qz-myans-t">' + esc(myAns) + '</div></div>');
          h.push('<div class="qz-self"><span class="qz-self-l">自评：</span>' +
            '<button class="btn sm' + (st === ST.RIGHT ? ' on' : '') + '" id="qa-ok">我答对了</button>' +
            '<button class="btn sm' + (st === ST.WRONG ? ' on' : '') + '" id="qa-no">没答全</button></div>');
        }
        h.push('</div>');
      }
    }
    h.push('</div>');

    /* 笔记：已作答后题目下方就地展开（对齐阶段考 note-inline） */
    if (answered || m === 3) {
      if (noteOpen) h.push(noteEditorHTML(qid));
      else if (note) h.push('<div class="qz-noteprev" id="note-prev">' + icon('pen') + '<span>' + esc(note) + '</span></div>');
    }

    /* 工具条：收藏 / 笔记 / 已掌握 / 重做本题 */
    if (answered || m === 3) {
      h.push('<div class="qz-tools">' +
        '<button class="qz-tool' + (Z.store.qfav[qid] ? ' on' : '') + '" id="q-fav">' + icon('star') + '<span>收藏</span></button>' +
        '<button class="qz-tool' + (note ? ' on' : '') + '" id="q-note">' + icon('pen') + '<span>笔记</span></button>' +
        '<button class="qz-tool' + (st === ST.SKIP ? ' on' : '') + '" id="q-skip">' + icon('check') + '<span>已掌握</span></button>' +
        '<button class="qz-tool" id="q-redo">' + icon('refresh') + '<span>重做本题</span></button>' +
        '</div>');
    }

    /* 底部操作条（对齐阶段考 qfoot：上一题 / 答题卡 / 下一题） */
    h.push('<div class="qz-foot">' +
      '<button class="btn sm qz-fb" id="q-prev"' + (s.idx <= 0 ? ' disabled' : '') + '>上一题</button>' +
      '<button class="btn sm qz-fb" id="q-card">' + icon('grid') + '答题卡</button>' +
      '<button class="btn sm primary qz-fb" id="q-next">' +
      (s.idx >= qs.length - 1 ? '已到最后一题' : '下一题') + '</button>' +
      '</div>');
    main.innerHTML = h.join('');
    bindRun(main, s, q, qid, r, st, answer, opts, qs);
  }

  var revealMissing = {};

  function keepScroll(fn) {
    var y = window.scrollY;
    fn();
    window.scrollTo(0, y);
  }
  function rerun() { keepScroll(function () { UI.render(); }); }

  function bindRun(main, s, q, qid, r, st, answer, opts, qs) {
    var m = mode();
    var answered = st === ST.RIGHT || st === ST.WRONG || st === ST.SKIP || st === ST.PENDING;
    function submitChoice(keys) {
      if (!answer.length) { UI.toast('本题参考答案缺失'); return; }
      var ok = Z.sameAnswer(keys, answer);
      writeRec(qid, keys, ok ? ST.RIGHT : ST.WRONG, true);
      if (s.sel) delete s.sel[qid];
      saveSess(s);
      rerun();
      if (m === 1 && ok) setTimeout(function () { next(); }, 420);
    }
    function next() {
      if (s.idx >= qs.length - 1) { UI.toast('已经是最后一题了'); return; }
      if (noteOpen) { commitNote(qid); noteOpen = false; }
      s.idx++;
      if (s.filter === 'all') setLastPos(s.cid, s.type, s.idx);
      saveSess(s);
      window.scrollTo(0, 0);
      UI.render();
    }
    function prev() {
      if (s.idx <= 0) { UI.toast('已经是第一题'); return; }
      if (noteOpen) { commitNote(qid); noteOpen = false; }
      s.idx--;
      if (s.filter === 'all') setLastPos(s.cid, s.type, s.idx);
      saveSess(s);
      window.scrollTo(0, 0);
      UI.render();
    }

    qsa(main, '[data-opt]').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-opt');
        if (m === 3) { UI.toast('背题模式：已直接显示答案'); return; }
        if (answered) { UI.toast('本题已作答'); return; }
        if (q.type === 'X') {
          /* 多选：勾选后提交（需求 2 的单题提交） */
          s.sel = s.sel || {};
          var cur = (s.sel[qid] || []).slice();
          var i = cur.indexOf(k);
          if (i >= 0) cur.splice(i, 1); else cur.push(k);
          s.sel[qid] = cur;
          saveSess(s);
          rerun();
          return;
        }
        submitChoice([k]);
      };
    });
    var sb = main.querySelector('#q-submit');
    if (sb) sb.onclick = function () {
      if (isChoice(q)) {
        var cur = (s.sel && s.sel[qid]) || [];
        if (!cur.length) { UI.toast('先选择答案'); return; }
        submitChoice(cur.slice());
      } else {
        var ta = main.querySelector('#qa-txt');
        var txt = ta ? String(ta.value || '').trim() : '';
        if (!txt) { UI.toast('先输入答案'); return; }
        writeRec(qid, txt, ST.PENDING, true);
        if (s.drafts) delete s.drafts[qid];
        saveSess(s);
        rerun();
      }
    };
    var ta = main.querySelector('#qa-txt');
    if (ta) ta.oninput = function () {
      s.drafts = s.drafts || {};
      s.drafts[qid] = ta.value;
    };
    var okB = main.querySelector('#qa-ok'), noB = main.querySelector('#qa-no');
    if (okB) okB.onclick = function () {
      selfEval(qid, true);
      rerun();
      if (m === 1) setTimeout(function () { next(); }, 420);
    };
    if (noB) noB.onclick = function () { selfEval(qid, false); rerun(); };
    var rev = main.querySelector('#q-reveal');
    if (rev) rev.onclick = function () { revealMissing[qid] = 1; rerun(); };
    var fv = main.querySelector('#q-fav');
    if (fv) fv.onclick = function () {
      if (Z.store.qfav[qid]) delete Z.store.qfav[qid]; else Z.store.qfav[qid] = 1;
      Z.save(true); rerun();
      UI.toast(Z.store.qfav[qid] ? '已收藏' : '已取消收藏');
    };
    var sk = main.querySelector('#q-skip');
    if (sk) sk.onclick = function () {
      if (!Z.store.rec[qid]) { UI.toast('本题还未作答'); return; }
      var on = toggleMastered(qid);
      rerun();
      UI.toast(on ? '已标记「已掌握」' : '已取消「已掌握」');
    };
    var rd = main.querySelector('#q-redo');
    if (rd) rd.onclick = function () {
      if (!Z.store.rec[qid]) { UI.toast('本题还没作答'); return; }
      var rr = recOf(qid);
      UI.confirmDialog('重做本题',
        '将清除本题当前的作答痕迹（答题卡回到「未做」），可以重新作答。历史作答次数与对错统计会保留。\n' +
        (rr && rr.n ? ('本题历史：已做 ' + rr.n + ' 次 · 答对 ' + (rr.r || 0) + ' 次 · 答错 ' + (rr.w || 0) + ' 次') : ''),
        '重做', '取消').then(function (ok) {
          if (!ok) return;
          clearQuestion(qid);
          if (s.sel) delete s.sel[qid];
          if (s.drafts) delete s.drafts[qid];
          saveSess(s);
          UI.toast('已清空本题痕迹，可重新作答（历史统计保留）');
          rerun();
        });
    };
    var nt = main.querySelector('#q-note');
    if (nt) nt.onclick = function () {
      if (noteOpen) { commitNote(qid); noteOpen = false; rerun(); return; }
      noteOpen = true; noteDraft = noteOf(qid); rerun();
    };
    var np = main.querySelector('#note-prev');
    if (np) np.onclick = function () { noteOpen = true; noteDraft = noteOf(qid); rerun(); };
    var nsave = main.querySelector('#note-save');
    if (nsave) nsave.onclick = function () {
      var t = main.querySelector('#note-ta');
      noteDraft = t ? t.value : '';
      commitNote(qid);
      noteOpen = false; rerun();
      UI.toast(noteOf(qid) ? '笔记已保存' : '笔记已清空');
    };
    var ndel = main.querySelector('#note-del');
    if (ndel) ndel.onclick = function () {
      delete Z.store.qnotes[qid];
      Z.save(true); noteDraft = null; noteOpen = false; rerun();
      UI.toast('笔记已删除');
    };
    var pv = main.querySelector('#q-prev'); if (pv) pv.onclick = prev;
    var nx = main.querySelector('#q-next'); if (nx) nx.onclick = next;
    var cd = main.querySelector('#q-card');
    var ch = cardHash(s.cid, s.type, s.filter);
    if (cd) cd.onclick = function () { UI.go(ch); };
  }

  function commitNote(qid) {
    if (!noteOpen) return;
    var v = (noteDraft == null ? '' : String(noteDraft)).trim();
    if (v) Z.store.qnotes[qid] = v; else delete Z.store.qnotes[qid];
    noteDraft = null;
    Z.save(true);
  }
  function noteEditorHTML(qid) {
    var val = (noteDraft != null) ? noteDraft : noteOf(qid);
    return '<div class="qz-note"><div class="qz-note-hd">' + icon('pen') + '<span>本题笔记</span><em>只保存在本机</em></div>' +
      '<textarea class="qz-note-ta" id="note-ta" maxlength="2000" placeholder="写下这道题的记忆点 / 易错点…">' + esc(val) + '</textarea>' +
      '<div class="qz-note-act"><button class="btn sm" id="note-del">删除</button>' +
      '<button class="btn sm primary" id="note-save">保存笔记</button></div></div>';
  }

  /* =========================================================
     5. 错题本 / 收藏 / 笔记（阶段考 viewWrong：分段 + 按课程归纳）
     ========================================================= */
  function renderWrong(main, p, q) {
    var seg = (q && q.seg) || 'wrong';
    if (seg !== 'wrong' && seg !== 'fav' && seg !== 'note') seg = 'wrong';
    var title = seg === 'wrong' ? '错题本' : seg === 'fav' ? '我的收藏' : '我的笔记';
    UI.header({ title: title, sub: '错题与收藏', back: true, backTo: '#/quiz' });
    var h = ['<div class="qz-seg">' +
      '<button data-seg="wrong" class="' + (seg === 'wrong' ? 'on' : '') + '">错题本</button>' +
      '<button data-seg="fav" class="' + (seg === 'fav' ? 'on' : '') + '">我的收藏</button>' +
      '<button data-seg="note" class="' + (seg === 'note' ? 'on' : '') + '">我的笔记</button>' +
      '</div>'];
    var any = false, total = 0;
    (Z.QZ.chapters || []).forEach(function (ch) {
      var rows = '';
      typesOf(ch).forEach(function (t) {
        var cnt = listOf(ch.id, t, seg).length;
        if (!cnt) return;
        total += cnt;
        rows += '<div class="qz-trow" data-wb="' + ch.id + '" data-wt="' + t + '">' +
          '<span class="qz-tag t-' + t.toLowerCase() + '">' + TYPE[t].tag + '</span>' +
          '<div class="grow"><div class="qz-tname">' + esc(ch.no + ' ' + ch.name) + '</div>' +
          '<div class="qz-tsub">' + typeName(t) + '</div></div>' +
          '<div class="qz-tn">' + cnt + ' 题 <span class="qz-chev">›</span></div></div>';
      });
      if (rows) { any = true; h.push('<div class="qz-h2">' + esc(ch.no + ' ' + ch.name) + '</div><div class="card qz-tlist">' + rows + '</div>'); }
    });
    if (!any) h.push(UI.emptyBox('还没有' + (seg === 'wrong' ? '错题' : seg === 'fav' ? '收藏' : '笔记'), '去刷几题吧'));
    else h.push('<div class="qz-muted qz-center">共 ' + total + ' 题</div>');
    main.innerHTML = h.join('');
    qsa(main, '[data-seg]').forEach(function (b) {
      b.onclick = function () { UI.go('#/qwrong?seg=' + b.getAttribute('data-seg')); };
    });
    qsa(main, '[data-wb]').forEach(function (b) {
      b.onclick = function () {
        var cid = b.getAttribute('data-wb'), t = b.getAttribute('data-wt');
        var f = seg;
        var list = listOf(cid, t, f);
        if (!list.length) { UI.toast('这个集合里没有题目'); return; }
        startRun(cid, t, f);
      };
    });
  }

  /* ---------------- 路由注册 ---------------- */
  UI.VIEWS.quiz = renderHome;
  UI.VIEWS.qtypes = renderTypes;
  UI.VIEWS.qcard = renderCard;
  UI.VIEWS.qrun = renderRun;
  UI.VIEWS.qwrong = renderWrong;

  /* 暴露给自测 / 其它模块 */
  window.YL_QUIZ_UI = {
    ST: ST, TYPE: TYPE, MODES: MODES,
    stOf: stOf, recOf: recOf, mode: mode, modeName: modeName, setMode: setMode,
    startRun: startRun, cardHash: cardHash,
    listOf: listOf, statOf: statOf, chapterStat: chapterStat,
    clearQuestion: clearQuestion, clearType: clearType,
    wrongN: wrongN, favN: favN, noteN: noteN
  };
})();
