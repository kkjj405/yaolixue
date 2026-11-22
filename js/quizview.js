/* 药理学 · 刷题（对齐阶段考：选中即判 / 无交卷 / 文本题打字提交 / 按章答题卡 / 重做可选范围） */
(function () {
  'use strict';
  var Z = window.YL, UI = window.YL_UI;
  var esc = Z.esc, icon = UI.icon;
  var TYPE_NAME = { A1: '单选题', B1: '配伍选择题', X: '多项选择题', NM: '名词解释', QA: '问答题' };
  var TYPE_SHORT = { A1: '单选', B1: '配伍', X: '多选', NM: '名词', QA: '问答' };
  var ORDER = ['A1', 'B1', 'X', 'NM', 'QA'];
  var st = { filter: 'all', open: {} };

  function sess() { return Z.store.sessions.cur; }
  function saveSess(s) { Z.store.sessions.cur = s; Z.save(true); }
  function chapterOf(cid) { return (Z.QZ.chapters || []).filter(function (c) { return c.id === cid; })[0]; }
  function judgedOf(s, id) { return s.judged[id]; }
  function rightCount(s) {
    var n = 0;
    Object.keys(s.judged || {}).forEach(function (k) { if (s.judged[k] === 1) n++; });
    return n;
  }
  function record(qid, ok) {
    var d = Z.store.done[qid] || { n: 0, ok: 0 };
    d.n++; if (ok) d.ok++;
    Z.store.done[qid] = d;
    if (!ok) Z.store.wrong[qid] = (Z.store.wrong[qid] || 0) + 1;
    else if (Z.store.wrong[qid]) delete Z.store.wrong[qid];
  }
  function startSession(cid, type, ids, title) {
    if (!ids.length) { UI.toast('没有题目'); return; }
    saveSess({ cid: cid, type: type || '', order: ids, idx: 0, answers: {}, judged: {},
      title: title || '', ts: Date.now() });
    UI.go('#/qrun');
  }

  /* ================= 0. 重做：范围选择 ================= */
  function redoDialog(cid) {
    var ch = cid ? chapterOf(cid) : null;
    var base = cid ? Z.questionsOf(cid) : Z.qList.slice();
    var wronset = {}; Z.wrongList().forEach(function (id) { wronset[id] = 1; });
    var faveset = {}; Z.favQList().forEach(function (id) { faveset[id] = 1; });
    var h = ['<div class="redo-scope">' +
      '<label class="rd"><input type="radio" name="rd" value="all" checked><span>全部题目（' + base.length + '）</span></label>' +
      '<label class="rd"><input type="radio" name="rd" value="wrong"><span>只做错题（' + base.filter(function (q) { return wronset[q.id]; }).length + '）</span></label>' +
      '<label class="rd"><input type="radio" name="rd" value="none"><span>只做未做（' + base.filter(function (q) { return !Z.store.done[q.id]; }).length + '）</span></label>' +
      '<label class="rd"><input type="radio" name="rd" value="fav"><span>只做收藏（' + base.filter(function (q) { return faveset[q.id]; }).length + '）</span></label>' +
      '<label class="rd"><input type="radio" name="rd" value="range"><span>题号范围：</span>' +
      '<input class="input xs" id="rd-from" placeholder="从" style="width:64px"> — <input class="input xs" id="rd-to" placeholder="到" style="width:64px"></label></div>'];
    UI.dialog({
      title: '重做（' + (ch ? ch.name : '全部章节') + '）',
      html: h.join(''),
      buttons: [{ text: '取消', value: false }, { text: '开始重做', value: true, primary: true }]
    }).then(function (ok) {
      if (!ok) return;
      var el = document.querySelector('#dialog');
      var v = el.querySelector('input[name="rd"]:checked').value;
      var from = parseInt(el.querySelector('#rd-from').value, 10);
      var to = parseInt(el.querySelector('#rd-to').value, 10);
      if (v === 'range') {
        if (!from || !to) { UI.toast('请填写题号范围'); return; }
        var lo = Math.min(from, to), hi = Math.max(from, to);
        var picked = base.slice(lo - 1, hi);
        startSession(cid, '', picked.map(function (q) { return q.id; }), (ch ? ch.name + ' · ' : '') + '题号 ' + lo + '~' + hi);
        return;
      }
      var ids = base.filter(function (q) {
        if (v === 'wrong') return wronset[q.id];
        if (v === 'none') return !Z.store.done[q.id];
        if (v === 'fav') return faveset[q.id];
        return true;
      }).map(function (q) { return q.id; });
      if (!ids.length) { UI.toast('该范围没有题目'); return; }
      startSession(cid, '', ids, (ch ? ch.name + ' · ' : '') + ({ all: '全部', wrong: '错题', none: '未做', fav: '收藏' })[v]);
    });
  }

  /* ================= 1. 目录 ================= */
  function renderQuizHome(main) {
    UI.header({ title: '刷题', sub: Z.QZ.stats.questions + ' 题',
      actions: [{ icon: 'refresh', label: '重做', onClick: function () { redoDialog(''); } }] });
    var h = [];
    var s = sess();
    if (s) {
      var done = Object.keys(s.judged || {}).length;
      h.push('<div class="card resume"><div class="row between mb8"><b>继续上次刷题</b>' +
        '<span class="chip gray tiny">' + esc(s.title || '') + '</span></div>' +
        '<div class="small muted">已答 ' + done + ' / ' + s.order.length + ' · 正确 ' + rightCount(s) + '</div>' +
        '<div class="row" style="gap:8px;margin-top:10px"><button class="btn sm primary grow" id="resume">继续答题</button>' +
        '<button class="btn sm" id="discard">结束本组</button></div></div>');
    }
    var wrong = Z.wrongList().length, fav = Z.favQList().length, undone = Z.qList.filter(function (q) { return !Z.store.done[q.id]; }).length;
    h.push('<div class="card"><div class="row between mb8"><b>我的题库</b><span class="tiny dim">共 ' + Z.qList.length + ' 题</span></div>' +
      '<div class="row wrap" style="gap:8px">' +
      '<button class="chip' + (st.filter === 'all' ? ' on' : '') + '" data-flt="all">全部章节</button>' +
      '<button class="chip' + (st.filter === 'wrong' ? ' on' : '') + '" data-flt="wrong">错题 ' + wrong + '</button>' +
      '<button class="chip' + (st.filter === 'fav' ? ' on' : '') + '" data-flt="fav">收藏题 ' + fav + '</button>' +
      '<button class="chip" data-flt="none">未做 ' + undone + '</button></div>' +
      '<div class="row wrap" style="gap:8px;margin-top:10px">' +
      '<button class="btn sm primary" id="q-all">开始刷全部</button>' +
      '<button class="btn sm" id="q-redo">重做…</button></div></div>');
    h.push('<div id="qz-list"></div>');
    main.innerHTML = h.join('');
    renderList(main);
    main.querySelectorAll('[data-flt]').forEach(function (b) {
      b.onclick = function () {
        var f = b.getAttribute('data-flt');
        if (f === 'none') { startSession('', '', Z.qList.filter(function (q) { return !Z.store.done[q.id]; }).map(function (q) { return q.id; }), '未做题目'); return; }
        st.filter = f; UI.render();
      };
    });
    var rs = main.querySelector('#resume'); if (rs) rs.onclick = function () { UI.go('#/qrun'); };
    var ds = main.querySelector('#discard');
    if (ds) ds.onclick = function () {
      UI.confirmDialog('结束本组', '进度会保留在答题卡里，确定结束？', '结束', '继续').then(function (ok) {
        if (ok) { saveSess(null); delete Z.store.sessions.cur; Z.save(true); UI.render(); }
      });
    };
    main.querySelector('#q-all').onclick = function () { startSession('', '', Z.qList.map(function (q) { return q.id; }), '全部题目'); };
    main.querySelector('#q-redo').onclick = function () { redoDialog(st.filter === 'all' ? '' : (sess() || {}).cid || ''); };
  }

  function filterIds() {
    if (st.filter === 'wrong') return Z.wrongList();
    if (st.filter === 'fav') return Z.favQList();
    return null;
  }

  function renderList(main) {
    var box = main.querySelector('#qz-list');
    if (!box) return;
    var fid = filterIds();
    if (fid) {
      if (!fid.length) { box.innerHTML = UI.emptyBox(st.filter === 'wrong' ? '错题本是空的' : '还没有收藏题目'); return; }
      var byCh = {};
      fid.forEach(function (id) { var q = Z.qBy[id]; (byCh[q.chapterId] = byCh[q.chapterId] || []).push(id); });
      box.innerHTML = Object.keys(byCh).map(function (cid) {
        var ch = chapterOf(cid);
        return '<div class="card"><div class="row between mb8"><b>' + esc(ch ? ch.no + ' ' + ch.name : '') + '</b>' +
          '<span class="row" style="gap:6px"><button class="btn xs" data-card="' + cid + '">答题卡</button>' +
          '<button class="btn xs primary" data-redo="' + cid + '">重做</button></span></div>' +
          byCh[cid].map(function (id) {
            var q = Z.qBy[id], j = Z.store.wrong[id] ? 'bad' : (Z.store.done[id] ? 'ok' : '');
            return '<a class="er" href="#/qcard/' + cid + '"><span class="er-kind ' + (j === 'bad' ? 'bad' : (j === 'ok' ? 'ok' : '')) + '">' +
              TYPE_SHORT[q.type] + '</span><span class="er-nm">' + esc(Z.clip(q.stem, 40)) + '</span></a>';
          }).join('') + '</div>';
      }).join('');
    } else {
      box.innerHTML = (Z.QZ.chapters || []).map(function (c, i) {
        var qs = Z.questionsOf(c.id);
        if (!qs.length) return '';
        var types = {};
        qs.forEach(function (q) { types[q.type] = (types[q.type] || 0) + 1; });
        var wrongN = qs.filter(function (q) { return Z.store.wrong[q.id]; }).length;
        var doneN = qs.filter(function (q) { return Z.store.done[q.id]; }).length;
        return '<div class="qchap' + (st.open[c.id] ? ' open' : '') + '" data-qch="' + c.id + '"><div class="qchap-hd">' +
          '<span class="kc-no">' + (i + 1) + '</span><span class="kc-bd"><span class="kc-t">' + esc(c.name) + '</span>' +
          '<span class="kc-s">' + qs.length + ' 题 · 已答 ' + doneN + (wrongN ? ' · 错 ' + wrongN : '') + '</span></span>' +
          '<span class="at-go">›</span></div><div class="qchap-bd">' +
          '<div class="row wrap" style="gap:6px;padding:8px 14px">' +
          ORDER.filter(function (t) { return types[t]; }).map(function (t) {
            return '<button class="btn xs" data-st="' + c.id + '|' + t + '">' + TYPE_SHORT[t] + ' ' + types[t] + '</button>';
          }).join('') +
          '<button class="btn xs primary" data-st="' + c.id + '|">全部 ' + qs.length + '</button>' +
          '<button class="btn xs" data-card="' + c.id + '">答题卡</button>' +
          '<button class="btn xs" data-redo="' + c.id + '">重做…</button>' +
          '</div></div></div>';
      }).join('');
    }
    box.querySelectorAll('[data-qch] .qchap-hd').forEach(function (hd) {
      hd.onclick = function () {
        var box2 = hd.closest('[data-qch]'), id = box2.getAttribute('data-qch');
        st.open[id] = !st.open[id]; box2.classList.toggle('open', !!st.open[id]);
      };
    });
    box.querySelectorAll('[data-st]').forEach(function (b) {
      b.onclick = function () {
        var v = b.getAttribute('data-st').split('|');
        var ch = chapterOf(v[0]);
        var qs = Z.questionsOf(v[0], v[1] || '');
        startSession(v[0], v[1], qs.map(function (q) { return q.id; }),
          (ch ? ch.name : '') + (v[1] ? ' · ' + TYPE_NAME[v[1]] : ''));
      };
    });
    box.querySelectorAll('[data-card]').forEach(function (b) { b.onclick = function () { UI.go('#/qcard/' + b.getAttribute('data-card')); }; });
    box.querySelectorAll('[data-redo]').forEach(function (b) { b.onclick = function () { redoDialog(b.getAttribute('data-redo')); }; });
  }

  /* ================= 2. 答题卡（按章 / 按题型分组） ================= */
  function renderCard(main, p) {
    var cid = p[0], ch = chapterOf(cid);
    if (!ch) { main.innerHTML = UI.emptyBox('章节不存在'); return; }
    UI.header({ title: '答题卡', sub: ch.no + ' ' + ch.name, back: true, backTo: '#/quiz' });
    var s = sess();
    var inSession = s && s.cid === cid;
    var qs = Z.questionsOf(cid);
    var h = ['<div class="card"><div class="row between mb8"><b>' + esc(ch.name) + '</b>' +
      '<span class="chip gray tiny">' + qs.length + ' 题</span></div>' +
      '<div class="dr-legend"><span class="lg ok"></span>对 <span class="lg bad"></span>错 <span class="lg"></span>未做 <span class="lg fav"></span>收藏</div>' +
      '<div class="row" style="gap:8px;margin-top:6px">' +
      '<button class="btn sm primary" id="card-start">' + (inSession ? '继续作答' : '从第一题开始') + '</button>' +
      '<button class="btn sm" id="card-redo">重做…</button></div></div>'];
    ORDER.forEach(function (t) {
      var list = qs.filter(function (q) { return q.type === t; });
      if (!list.length) return;
      h.push('<div class="card"><div class="row between mb8"><b>' + TYPE_NAME[t] + '</b>' +
        '<span class="tiny dim">' + list.length + ' 题</span></div><div class="grid-b">' +
        list.map(function (q) {
          var j = Z.store.done[q.id] ? (Z.store.wrong[q.id] ? 'bad' : 'ok') : '';
          var cls = j;
          if (s && s.order[s.idx] === q.id) cls += ' cur';
          if (Z.store.qfav[q.id]) cls += ' fav';
          return '<button class="gc' + cls + '" data-jq="' + q.id + '">' + q.no + '</button>';
        }).join('') + '</div></div>');
    });
    main.innerHTML = h.join('');
    main.querySelectorAll('[data-jq]').forEach(function (b) {
      b.onclick = function () {
        var qid = b.getAttribute('data-jq');
        var q = Z.qBy[qid];
        var order = Z.questionsOf(cid, q.type).map(function (x) { return x.id; });
        var idx = order.indexOf(qid);
        var s2 = sess();
        if (!s2 || s2.cid !== cid || s2.type !== q.type) {
          saveSess({ cid: cid, type: q.type, order: order, idx: Math.max(0, idx), answers: {}, judged: {},
            title: ch.name + ' · ' + TYPE_NAME[q.type], ts: Date.now() });
        } else { s2.idx = Math.max(0, idx); saveSess(s2); }
        UI.go('#/qrun');
      };
    });
    main.querySelector('#card-start').onclick = function () {
      if (inSession) { UI.go('#/qrun'); return; }
      startSession(cid, '', qs.map(function (q) { return q.id; }), ch.name);
    };
    main.querySelector('#card-redo').onclick = function () { redoDialog(cid); };
  }

  /* ================= 3. 答题页（选中即判，无交卷） ================= */
  function renderRun(main, p, q) {
    var s = sess();
    if (!s) { main.innerHTML = UI.emptyBox('还没有开始的题目', '去「刷题」目录选一组'); return; }
    if (q && q.jump) { var j = s.order.indexOf(q.jump); if (j >= 0) { s.idx = j; saveSess(s); } }
    var qid = s.order[s.idx], qq = Z.qBy[qid];
    if (!qq) { s.idx = 0; qid = s.order[0]; qq = Z.qBy[qid]; }
    var judged = s.judged[qid];
    var chosen = s.answers[qid];
    UI.header({ title: '第 ' + (s.idx + 1) + ' / ' + s.order.length + ' 题', sub: TYPE_NAME[qq.type],
      back: true, backTo: '#/quiz',
      actions: [{ icon: 'grid', label: '答题卡', onClick: function () { UI.go('#/qcard/' + (s.cid || '')); } },
                { icon: 'refresh', label: '重做', onClick: function () { redoDialog(s.cid || ''); } }] });
    var done = Object.keys(s.judged || {}).length;
    var h = ['<div class="card flat" style="padding:9px 12px"><div class="row between small">' +
      '<span>已答 ' + done + ' / ' + s.order.length + ' · 正确 ' + rightCount(s) + '</span>' +
      '<span class="muted">' + esc(s.title || '') + '</span></div>' +
      '<div class="pbar"><i style="width:' + Math.round((s.idx + 1) * 100 / s.order.length) + '%"></i></div></div>'];
    h.push('<div class="card"><div class="q-hd"><span class="q-tag">' + TYPE_SHORT[qq.type] + '</span>' +
      (qq.no ? '<span class="tiny dim">第 ' + qq.no + ' 题</span>' : '') +
      (Z.store.qfav[qid] ? '<span class="flag gold" title="已收藏">★</span>' : '') + '</div>');
    h.push('<div class="q-stem">' + esc(qq.stem) + '</div>');
    if (Z.isChoice(qq)) {
      var opts = Z.optionsOf(qq), multi = qq.type === 'X';
      if (qq.type === 'B1' && qq.sharedLabel) h.push('<div class="tiny dim q-shared">' + esc(qq.sharedLabel) + '</div>');
      h.push('<div class="q-opts">' + opts.map(function (o) {
        var picked = chosen && chosen.indexOf && chosen.indexOf(o.k) >= 0;
        var cls = picked ? ' chosen' : '';
        if (judged !== undefined) {
          if ((qq.answer || []).indexOf(o.k) >= 0) cls = ' right' + (picked ? ' chosen' : '');
          else if (picked) cls = ' wrong';
        }
        return '<button class="q-opt' + cls + '" data-opt="' + o.k + '"' + (judged !== undefined ? ' disabled' : '') + '>' +
          '<span class="q-lt">' + o.k + '</span><span class="q-ot">' + esc(o.t) + '</span></button>';
      }).join('') + '</div>');
      if (multi && judged === undefined) h.push('<div class="row" style="margin-top:10px"><button class="btn sm primary" id="q-submit"' +
        (chosen && chosen.length ? '' : ' disabled') + '>提交本题（多选）</button><span class="tiny dim" style="align-self:center">可多选，选完点提交</span></div>');
      if (!multi && judged === undefined) h.push('<div class="tiny dim" style="margin-top:8px">点选项即提交并判对错</div>');
    } else {
      h.push('<div class="ans-input"><textarea class="textarea" id="qa-txt" placeholder="' +
        (qq.type === 'NM' ? '输入你的名词解释…' : '输入你的答案（要点即可）…') + '"' +
        (judged !== undefined ? ' readonly' : '') + '>' + esc(typeof chosen === 'string' ? chosen : '') + '</textarea>' +
        (judged === undefined ? '<div class="row" style="gap:8px;margin-top:8px"><button class="btn sm primary" id="q-submit">提交本题</button>' +
          '<span class="tiny dim" style="align-self:center">提交后显示参考答案，由你自己评分</span></div>' : '') + '</div>');
    }
    if (judged !== undefined) {
      h.push('<div class="q-res' + (judged === 1 ? ' ok' : ' bad') + '">' + (judged === 1 ? '✓ 答对了' : '✗ 答错了') +
        (Z.isChoice(qq) && qq.answer ? '<span class="tiny dim"> 正确答案：' + qq.answer.join('') + '</span>' : '') + '</div>');
      if (!Z.isChoice(qq)) {
        h.push('<div class="ans-box"><div class="ans-h">参考答案</div><div class="rich">' +
          Z.renderRich([{ t: 'p', x: qq.answerText || '（原书未给出参考答案）' }]) + '</div></div>');
        h.push('<div class="row" style="gap:8px;margin-top:8px"><span class="tiny dim" style="align-self:center">自评：</span>' +
          '<button class="btn sm' + (judged === 1 ? ' on' : '') + '" id="qa-ok">我答对了</button>' +
          '<button class="btn sm' + (judged === 0 ? ' on' : '') + '" id="qa-no">没答全</button></div>');
      }
    }
    h.push('<div class="row wrap" style="gap:8px;margin-top:12px">' +
      '<button class="btn sm' + (Z.store.qfav[qid] ? ' on' : '') + '" id="q-fav">' + icon('star') + (Z.store.qfav[qid] ? '已藏' : '收藏') + '</button>' +
      '<button class="btn sm" id="q-note">' + icon('note') + '笔记' + ((Z.store.qnotes[qid]) ? ' ●' : '') + '</button>' +
      '<button class="btn sm" id="q-card">' + icon('grid') + '本章答题卡</button></div><div id="q-note-box"></div></div>');
    if (s.idx >= s.order.length - 1 && done >= s.order.length) {
      h.push('<div class="card res-card sm"><div class="res-t">本组已完成</div><div class="res-big">' +
        Math.round(rightCount(s) * 100 / s.order.length) + '<span>%</span></div>' +
        '<div class="res-sub">' + s.order.length + ' 题 · 正确 ' + rightCount(s) + '</div>' +
        '<div class="row" style="gap:8px;justify-content:center;margin-top:10px">' +
        '<button class="btn sm primary" id="fin-redo">重做本组</button><button class="btn sm" id="fin-back">回目录</button></div></div>');
    }
    h.push('<div class="q-bar"><button class="btn sm" id="q-prev"' + (s.idx <= 0 ? ' disabled' : '') + '>上一题</button>' +
      '<button class="btn sm" id="q-card2">答题卡</button>' +
      '<button class="btn sm primary" id="q-next">' + (s.idx >= s.order.length - 1 ? '下一组' : '下一题') + '</button></div>');
    main.innerHTML = h.join('');
    bindRun(main, s, qq, qid);

    function submitChoice(k) {
      if (qq.type === 'X') {
        var cur = (s.answers[qid] && s.answers[qid].slice()) || [];
        var i = cur.indexOf(k);
        if (i >= 0) cur.splice(i, 1); else cur.push(k);
        s.answers[qid] = cur; saveSess(s); UI.render(); return;
      }
      s.answers[qid] = [k];
      var ok = Z.sameAnswer([k], qq.answer || []);
      s.judged[qid] = ok ? 1 : 0; record(qid, !!ok); saveSess(s);
      var y = window.scrollY; UI.render(); window.scrollTo(0, y);
    }
    window.__ylSubmitChoice = submitChoice;
  }

  function bindRun(main, s, qq, qid) {
    main.querySelectorAll('[data-opt]').forEach(function (b) {
      b.onclick = function () { if (s.judged[qid] === undefined) window.__ylSubmitChoice(b.getAttribute('data-opt')); };
    });
    var sb = main.querySelector('#q-submit');
    if (sb) sb.onclick = function () {
      if (Z.isChoice(qq)) {
        if (!(s.answers[qid] || []).length) { UI.toast('先选答案'); return; }
        var ok = Z.sameAnswer(s.answers[qid], qq.answer || []);
        s.judged[qid] = ok ? 1 : 0; record(qid, !!ok); saveSess(s);
      } else {
        var ta = main.querySelector('#qa-txt');
        s.answers[qid] = ta ? ta.value : '';
        s.judged[qid] = 1; record(qid, true); saveSess(s);
      }
      var y = window.scrollY; UI.render(); window.scrollTo(0, y);
    };
    var okB = main.querySelector('#qa-ok'), noB = main.querySelector('#qa-no');
    if (okB) okB.onclick = function () { s.judged[qid] = 1; record(qid, true); saveSess(s); UI.render(); };
    if (noB) noB.onclick = function () { s.judged[qid] = 0; record(qid, false); saveSess(s); UI.render(); };
    var fv = main.querySelector('#q-fav');
    if (fv) fv.onclick = function () {
      if (Z.store.qfav[qid]) delete Z.store.qfav[qid]; else Z.store.qfav[qid] = 1;
      Z.save(true); UI.render();
    };
    var nt = main.querySelector('#q-note');
    if (nt) nt.onclick = function () { noteEditor(main, qid); };
    var cd = main.querySelector('#q-card'); if (cd) cd.onclick = function () { UI.go('#/qcard/' + (s.cid || '')); };
    var cd2 = main.querySelector('#q-card2'); if (cd2) cd2.onclick = function () { UI.go('#/qcard/' + (s.cid || '')); };
    var pv = main.querySelector('#q-prev');
    if (pv) pv.onclick = function () { if (s.idx > 0) { s.idx--; saveSess(s); UI.go('#/qrun'); } };
    var nx = main.querySelector('#q-next');
    if (nx) nx.onclick = function () {
      if (s.idx >= s.order.length - 1) {
        UI.toast('本组已到最后一题');
        var back = main.querySelector('#fin-back');
        if (back && s.order.length) UI.go('#/quiz');
        return;
      }
      s.idx++; saveSess(s); UI.go('#/qrun');
    };
    var fr = main.querySelector('#fin-redo');
    if (fr) fr.onclick = function () { redoDialog(s.cid || ''); };
    var fb = main.querySelector('#fin-back');
    if (fb) fb.onclick = function () { UI.go('#/quiz'); };
  }

  function noteEditor(main, qid) {
    var box = main.querySelector('#q-note-box');
    box.innerHTML = '<div class="panel"><div class="p-hd"><span>本题笔记</span><button class="btn xs ghost" id="nt-close">收起</button></div>' +
      '<textarea class="textarea" id="nt-ta" placeholder="记忆点 / 易错点…">' + esc(Z.store.qnotes[qid] || '') + '</textarea>' +
      '<div class="p-ft"><button class="btn sm" id="nt-del">删除</button><button class="btn sm primary" id="nt-save">保存</button></div></div>';
    box.querySelector('#nt-close').onclick = function () { box.innerHTML = ''; };
    box.querySelector('#nt-save').onclick = function () {
      var v = box.querySelector('#nt-ta').value;
      if (v.trim()) Z.store.qnotes[qid] = v; else delete Z.store.qnotes[qid];
      Z.save(true); UI.toast('笔记已保存'); box.innerHTML = '';
    };
    box.querySelector('#nt-del').onclick = function () { delete Z.store.qnotes[qid]; Z.save(true); box.innerHTML = ''; };
  }

  UI.VIEWS.quiz = renderQuizHome;
  UI.VIEWS.qcard = renderCard;
  UI.VIEWS.qrun = renderRun;
  window.YL_QUIZ_UI = { startSession: startSession, redoDialog: redoDialog };
})();
