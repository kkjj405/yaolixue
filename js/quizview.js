/* 药理学 · 刷题（目录 / 答题卡 / 收藏 / 笔记 / 错题 / 重做 / 交卷） */
(function () {
  'use strict';
  var Z = window.YL, UI = window.YL_UI;
  var esc = Z.esc, icon = UI.icon;
  var TYPE_NAME = { A1: '最佳选择题', B1: '配伍选择题', X: '多项选择题', NM: '名词解释', QA: '问答题' };
  var TYPE_SHORT = { A1: '最佳', B1: '配伍', X: '多选', NM: '名词', QA: '问答' };
  var st = { filter: 'all', tab: 'all', drawer: false };

  function curSession() { return Z.store.sessions.cur; }
  function saveSession() { Z.store.sessions.cur = curSession(); Z.save(true); }

  function barHTML(s) {
    var n = s.order.length, done = Object.keys(s.judged || {}).length;
    var right = Object.keys(s.judged || {}).filter(function (k) { return s.judged[k] === 1; }).length;
    return '<div class="card flat" style="padding:9px 12px"><div class="row between small">' +
      '<span>已完成 ' + done + ' / ' + n + (done ? ' · 正确 ' + right : '') + '</span>' +
      '<span class="muted">' + esc(s.title || '') + '</span></div>' +
      '<div class="pbar"><i style="width:' + (n ? Math.round(done * 100 / n) : 0) + '%"></i></div></div>';
  }

  /* ================= 刷题首页 / 目录 ================= */
  function renderQuizHome(main) {
    UI.header({ title: '刷题', sub: Z.QZ.stats.questions + ' 题',
      actions: [{ icon: 'chart', label: '答题卡', onClick: function () {
        var s = curSession();
        if (!s) { UI.toast('先开始一组题'); return; }
        UI.go('#/qrun');
      } }] });
    var h = [];
    var s = curSession();
    if (s) {
      h.push('<div class="card resume"><div class="row between mb8"><b>有一组未做完的题</b>' +
        '<span class="chip gray tiny">' + esc(s.title) + '</span></div>' +
        '<div class="small muted">进度 ' + Object.keys(s.judged || {}).length + '/' + s.order.length + '</div>' +
        '<div class="row" style="gap:8px;margin-top:10px"><button class="btn sm primary grow" id="resume">继续</button>' +
        '<button class="btn sm" id="discard">放弃</button></div></div>');
    }
    h.push('<div class="row wrap" style="gap:6px;margin:0 2px 10px">' +
      '<button class="chip' + (st.filter === 'all' ? ' on' : '') + '" data-flt="all">全部题目</button>' +
      '<button class="chip' + (st.filter === 'wrong' ? ' on' : '') + '" data-flt="wrong">错题 ' + Z.wrongList().length + '</button>' +
      '<button class="chip' + (st.filter === 'fav' ? ' on' : '') + '" data-flt="fav">收藏 ' + Z.favQList().length + '</button>' +
      '<button class="btn xs primary" id="q-all">刷全部（' + Z.QZ.stats.questions + '）</button></div>');
    h.push('<div id="qz-list"></div>');
    main.innerHTML = h.join('');
    renderList(main);
    main.querySelectorAll('[data-flt]').forEach(function (b) {
      b.onclick = function () { st.filter = b.getAttribute('data-flt'); UI.render(); };
    });
    main.querySelector('#q-all').onclick = function () {
      startSession('', '', Z.qList.map(function (q) { return q.id; }), '全部题目');
    };
    var rs = main.querySelector('#resume');
    if (rs) rs.onclick = function () { UI.go('#/qrun'); };
    var ds = main.querySelector('#discard');
    if (ds) ds.onclick = function () {
      UI.confirmDialog('放弃这组题', '进度不会保存，确定放弃？', '放弃', '留着').then(function (ok) {
        if (!ok) return; delete Z.store.sessions.cur; Z.save(true); UI.render();
      });
    };
  }

  function listHTML() {
    if (st.filter === 'wrong' || st.filter === 'fav') {
      var ids = st.filter === 'wrong' ? Z.wrongList() : Z.favQList();
      if (!ids.length) return UI.emptyBox(st.filter === 'wrong' ? '错题本是空的' : '还没有收藏题目');
      var byCh = {};
      ids.forEach(function (id) { var q = Z.qBy[id]; (byCh[q.chapterId] = byCh[q.chapterId] || []).push(id); });
      return Object.keys(byCh).map(function (cid) {
        var ch = (Z.QZ.chapters || []).filter(function (c) { return c.id === cid; })[0];
        return '<div class="card"><div class="row between mb8"><b>' + esc(ch ? ch.no + ' ' + ch.name : '') +
          '</b><button class="btn xs primary" data-do="' + cid + '">重做本章(' + byCh[cid].length + ')</button></div>' +
          byCh[cid].map(function (id) {
            var q = Z.qBy[id];
            return '<a class="er" href="#/qrun?jump=' + id + '"><span class="er-kind">' + TYPE_SHORT[q.type] +
              '</span><span class="er-nm">' + esc(Z.clip(q.stem, 42)) + '</span></a>';
          }).join('') + '</div>';
      }).join('');
    }
    return (Z.QZ.chapters || []).map(function (c) {
      var qs = Z.questionsOf(c.id);
      if (!qs.length) return '';
      var types = {};
      qs.forEach(function (q) { types[q.type] = (types[q.type] || 0) + 1; });
      var wrongN = qs.filter(function (q) { return Z.store.wrong[q.id]; }).length;
      return '<div class="chap open"><div class="chap-hd"><span class="cn">' + esc(c.no) + '　' + esc(c.name) +
        '</span><span class="chip gray tiny">' + qs.length + ' 题' + (wrongN ? ' · 错' + wrongN : '') + '</span></div>' +
        '<div class="chap-bd"><div class="row wrap" style="gap:6px;padding:8px 0">' +
        Object.keys(types).map(function (t) {
          return '<button class="btn xs" data-st="' + c.id + '|' + t + '">' + TYPE_SHORT[t] + ' ' + types[t] + '</button>';
        }).join('') + '<button class="btn xs primary" data-st="' + c.id + '|">本章全部 ' + qs.length + '</button></div></div></div>';
    }).join('');
  }

  function renderList(main) {
    var box = main.querySelector('#qz-list');
    if (!box) return;
    box.innerHTML = listHTML();
    box.querySelectorAll('[data-st]').forEach(function (b) {
      b.onclick = function () {
        var v = b.getAttribute('data-st').split('|');
        var ch = (Z.QZ.chapters || []).filter(function (c) { return c.id === v[0]; })[0];
        var qs = Z.questionsOf(v[0], v[1] || '');
        startSession(v[0], v[1], qs.map(function (q) { return q.id; }),
          (ch ? ch.no + ' ' + ch.name : '') + (v[1] ? ' · ' + TYPE_NAME[v[1]] : ''));
      };
    });
    box.querySelectorAll('[data-do]').forEach(function (b) {
      b.onclick = function () {
        var cid = b.getAttribute('data-do');
        var ids = (st.filter === 'wrong' ? Z.wrongList() : Z.favQList()).filter(function (id) { return Z.qBy[id].chapterId === cid; });
        var ch = (Z.QZ.chapters || []).filter(function (c) { return c.id === cid; })[0];
        startSession(cid, '', ids, (ch ? ch.name : '') + ' · ' + (st.filter === 'wrong' ? '错题' : '收藏'));
      };
    });
  }

  function startSession(cid, type, ids, title) {
    if (!ids.length) { UI.toast('没有题目'); return; }
    Z.store.sessions.cur = { cid: cid, type: type, order: ids, idx: 0, answers: {}, judged: {}, title: title, ts: Date.now() };
    Z.save(true);
    UI.go('#/qrun');
  }

  /* ================= 答题页 ================= */
  function renderRun(main, p, q) {
    var s = curSession();
    if (!s) { main.innerHTML = UI.emptyBox('还没有开始的题目', '去「刷题」目录选一组'); return; }
    if (q && q.jump) {
      var j = s.order.indexOf(q.jump);
      if (j >= 0) s.idx = j;
    }
    var qid = s.order[s.idx], qq = Z.qBy[qid];
    if (!qq) { s.idx = 0; qid = s.order[0]; qq = Z.qBy[qid]; }
    UI.header({ title: '第 ' + (s.idx + 1) + '/' + s.order.length + ' 题', sub: TYPE_NAME[qq.type],
      back: true, backTo: '#/quiz',
      actions: [{ icon: 'grid', label: '答题卡', onClick: function () { st.drawer = !st.drawer; UI.render(); } },
                { text: '交卷', label: '交卷', onClick: finish }] });
    var h = [];
    h.push(barHTML(s));
    var judged = s.judged[qid];          // 1 对 / 0 错 / undefined 未判
    var chosen = s.answers[qid] || [];
    h.push('<div class="card"><div class="q-hd"><span class="q-tag">' + TYPE_SHORT[qq.type] + '</span>' +
      (qq.no ? '<span class="tiny dim">第 ' + qq.no + ' 题</span>' : '') + '</div>');
    h.push('<div class="q-stem">' + esc(qq.stem) + '</div>');
    if (Z.isChoice(qq)) {
      var opts = Z.optionsOf(qq);
      if (qq.type === 'B1' && qq.sharedLabel) h.push('<div class="tiny dim q-shared">' + esc(qq.sharedLabel) + '</div>');
      h.push('<div class="q-opts">' + opts.map(function (o) {
        var cls = '';
        if (judged !== undefined) {
          if ((qq.answer || []).indexOf(o.k) >= 0) cls = ' right';
          if (chosen.indexOf(o.k) >= 0 && (qq.answer || []).indexOf(o.k) < 0) cls = ' wrong';
          if (chosen.indexOf(o.k) >= 0 && (qq.answer || []).indexOf(o.k) >= 0) cls = ' right chosen';
        } else if (chosen.indexOf(o.k) >= 0) cls = ' chosen';
        return '<button class="q-opt' + cls + '" data-opt="' + o.k + '"><span class="q-lt">' + o.k + '</span>' +
          '<span class="q-ot">' + esc(o.t) + '</span></button>';
      }).join('') + '</div>');
    } else {
      h.push('<div class="small muted">' + (qq.type === 'NM' ? '名词解释：请先在脑中作答，再对照参考答案自评。' : '问答题：请先作答，再对照参考答案自评。') + '</div>');
      if (judged !== undefined) {
        h.push('<div class="ans-box"><div class="ans-h">参考答案</div><div class="rich">' +
          Z.renderRich([{ t: 'p', x: qq.answerText || '（原书未给出参考答案）' }]) + '</div></div>');
      }
    }
    if (judged !== undefined) {
      h.push('<div class="q-res' + (judged === 1 ? ' ok' : ' bad') + '">' + (judged === 1 ? '✓ 答对了' : '✗ 答错了') +
        (Z.isChoice(qq) && qq.answer ? '<span class="tiny dim"> 正确答案：' + qq.answer.join('') + '</span>' : '') + '</div>');
    }
    h.push('<div class="row wrap" style="gap:8px;margin-top:10px">');
    if (judged === undefined) {
      if (Z.isChoice(qq)) h.push('<button class="btn sm primary" id="q-submit"' + (chosen.length ? '' : ' disabled') + '>提交本题</button>');
      else {
        h.push('<button class="btn sm" id="q-show">显示参考答案</button>');
        h.push('<button class="btn sm" id="q-ok">我记住了</button><button class="btn sm" id="q-no">再看一遍</button>');
      }
    }
    h.push('<button class="btn sm' + (Z.store.qfav[qid] ? ' on' : '') + '" id="q-fav">' + icon('star') + (Z.store.qfav[qid] ? '已藏' : '收藏') + '</button>');
    h.push('<button class="btn sm" id="q-note">' + icon('note') + '笔记</button></div>');
    h.push('<div id="q-note-box"></div></div>');
    h.push('<div class="pager-row"><button class="btn sm" id="q-prev"' + (s.idx <= 0 ? ' disabled' : '') + '>‹ 上一题</button>' +
      '<button class="btn sm primary" id="q-next">' + (s.idx >= s.order.length - 1 ? '完成并交卷 ›' : '下一题 ›') + '</button></div>');
    if (st.drawer) h.push(drawerHTML(s));
    main.innerHTML = h.join('');
    bindRun(main, s, qq, qid);
  }

  function judgeQ(qq, chosen) {
    if (Z.isChoice(qq)) return Z.sameAnswer(chosen, qq.answer || []) ? 1 : 0;
    return 1;
  }

  function bindRun(main, s, qq, qid) {
    main.querySelectorAll('[data-opt]').forEach(function (b) {
      b.onclick = function () {
        if (s.judged[qid] !== undefined) return;
        var k = b.getAttribute('data-opt');
        var cur = s.answers[qid] || [];
        if (qq.type === 'X') {
          var i = cur.indexOf(k);
          if (i >= 0) cur.splice(i, 1); else cur.push(k);
        } else cur = [k];
        s.answers[qid] = cur;
        main.querySelectorAll('[data-opt]').forEach(function (ob) {
          ob.classList.toggle('chosen', cur.indexOf(ob.getAttribute('data-opt')) >= 0);
        });
        var sb = main.querySelector('#q-submit'); if (sb) sb.disabled = !cur.length;
      };
    });
    var sb = main.querySelector('#q-submit');
    if (sb) sb.onclick = function () {
      var ch = s.answers[qid] || [];
      if (!ch.length) { UI.toast('先选答案'); return; }
      s.judged[qid] = judgeQ(qq, ch);
      record(qid, s.judged[qid]);
      saveSession();
      var y = window.scrollY; UI.replaceHash('#/qrun'); window.scrollTo(0, y);
    };
    var sh = main.querySelector('#q-show');
    if (sh) sh.onclick = function () { s.showAns = true; UI.replaceHash('#/qrun'); };
    var ok = main.querySelector('#q-ok');
    if (ok) ok.onclick = function () { s.judged[qid] = 1; record(qid, 1); saveSession(); UI.replaceHash('#/qrun'); };
    var no = main.querySelector('#q-no');
    if (no) no.onclick = function () { s.judged[qid] = 0; record(qid, 0); saveSession(); UI.replaceHash('#/qrun'); };
    var fv = main.querySelector('#q-fav');
    if (fv) fv.onclick = function () {
      if (Z.store.qfav[qid]) delete Z.store.qfav[qid]; else Z.store.qfav[qid] = 1;
      Z.save(true); UI.replaceHash('#/qrun');
    };
    var nt = main.querySelector('#q-note');
    if (nt) nt.onclick = function () {
      var box = main.querySelector('#q-note-box');
      box.innerHTML = '<div class="panel"><div class="p-hd"><span>本题笔记</span><button class="btn xs ghost" id="nt-close">收起</button></div>' +
        '<textarea class="textarea" id="nt-ta" placeholder="记忆点 / 易错点 / 为什么错…">' + esc(Z.store.qnotes[qid] || '') + '</textarea>' +
        '<div class="p-ft"><button class="btn sm" id="nt-del">删除</button><button class="btn sm primary" id="nt-save">保存</button></div></div>';
      box.querySelector('#nt-close').onclick = function () { box.innerHTML = ''; };
      box.querySelector('#nt-save').onclick = function () {
        var v = box.querySelector('#nt-ta').value;
        if (v.trim()) Z.store.qnotes[qid] = v; else delete Z.store.qnotes[qid];
        Z.save(true); UI.toast('笔记已保存'); box.innerHTML = '';
      };
      box.querySelector('#nt-del').onclick = function () { delete Z.store.qnotes[qid]; Z.save(true); box.innerHTML = ''; };
    };
    var pv = main.querySelector('#q-prev');
    if (pv) pv.onclick = function () { if (s.idx > 0) { s.idx--; saveSession(); UI.replaceHash('#/qrun'); } };
    var nx = main.querySelector('#q-next');
    if (nx) nx.onclick = function () {
      if (s.idx >= s.order.length - 1) { finish(); return; }
      s.idx++; saveSession(); UI.replaceHash('#/qrun');
    };
    // 答题卡
    if (st.drawer) {
      var dr = document.getElementById('q-drawer');
      if (dr) dr.onclick = function (e) {
        if (e.target === dr) { st.drawer = false; UI.replaceHash('#/qrun'); }
      };
      main.querySelectorAll('[data-gi]').forEach(function (b) {
        b.onclick = function () { s.idx = +b.getAttribute('data-gi'); st.drawer = false; saveSession(); UI.replaceHash('#/qrun'); };
      });
      main.querySelectorAll('[data-dc]').forEach(function (b) { b.onclick = function () { st.drawer = false; UI.replaceHash('#/qrun'); }; });
    }
  }

  function record(qid, ok) {
    var d = Z.store.done[qid] || { n: 0, ok: 0 };
    d.n++; if (ok) d.ok++;
    Z.store.done[qid] = d;
    if (!ok) Z.store.wrong[qid] = (Z.store.wrong[qid] || 0) + 1;
    else if (Z.store.wrong[qid]) delete Z.store.wrong[qid];
  }

  function drawerHTML(s) {
    var cells = s.order.map(function (id, i) {
      var j = s.judged[id];
      var cls = i === s.idx ? ' cur' : (j === 1 ? ' ok' : (j === 0 ? ' bad' : ''));
      if (Z.store.qfav[id]) cls += ' fav';
      return '<button class="gc' + cls + '" data-gi="' + i + '">' + (i + 1) + '</button>';
    }).join('');
    return '<div id="q-drawer" class="drawer"><div class="dr-card"><div class="dr-hd">答题卡' +
      '<button class="btn xs ghost" data-dc="1">收起</button></div>' +
      '<div class="dr-legend"><span class="lg ok"></span>对 <span class="lg bad"></span>错 <span class="lg"></span>未做 <span class="lg fav"></span>收藏</div>' +
      '<div class="grid-b">' + cells + '</div></div></div>';
  }

  /* ================= 交卷 ================= */
  function finish() {
    var s = curSession();
    if (!s) { UI.go('#/quiz'); return; }
    var n = s.order.length, judged = Object.keys(s.judged).length;
    var right = Object.keys(s.judged).filter(function (k) { return s.judged[k] === 1; }).length;
    UI.confirmDialog('交卷', '已完成 ' + judged + '/' + n + ' 题，正确 ' + right + ' 题。确定交卷？', '交卷', '继续答')
      .then(function (ok) {
        if (!ok) return;
        var bad = s.order.filter(function (id) { return s.judged[id] === 0; });
        Z.store.sessions.lastResult = { title: s.title, n: n, judged: judged, right: right, bad: bad, ts: Date.now() };
        delete Z.store.sessions.cur; Z.save(true);
        UI.go('#/qres');
      });
  }

  function renderResult(main) {
    var r = Z.store.sessions.lastResult;
    UI.header({ title: '成绩单', back: true, backTo: '#/quiz' });
    if (!r) { main.innerHTML = UI.emptyBox('还没有成绩'); return; }
    var rate = r.judged ? Math.round(r.right * 100 / r.judged) : 0;
    var h = ['<div class="card res-card"><div class="res-t">' + esc(r.title) + '</div>' +
      '<div class="res-big">' + rate + '<span>%</span></div>' +
      '<div class="res-sub">已完成 ' + r.judged + '/' + r.n + ' 题 · 正确 ' + r.right + ' · 错 ' + (r.judged - r.right) + '</div></div>'];
    h.push('<div class="row wrap" style="gap:8px;margin:0 2px 12px">' +
      '<button class="btn sm primary" id="redo-wrong">重做错题(' + r.bad.length + ')</button>' +
      '<button class="btn sm" id="redo-all">重做本组</button>' +
      '<button class="btn sm" id="back-dir">回目录</button></div>');
    if (r.bad.length) {
      h.push('<div class="card"><b>错题回顾</b>' + r.bad.map(function (id) {
        var q = Z.qBy[id];
        return '<div class="res-q"><div class="tiny dim">' + TYPE_SHORT[q.type] + ' · 第 ' + q.no + ' 题</div>' +
          '<div>' + esc(q.stem) + '</div><div class="tiny" style="color:var(--green)">答案：' +
          (q.answer ? q.answer.join('') : '（自评）') + '</div></div>';
      }).join('') + '</div>');
    }
    main.innerHTML = h.join('');
    main.querySelector('#redo-wrong').onclick = function () {
      if (!r.bad.length) { UI.toast('没有错题'); return; }
      startSession('', '', r.bad.slice(), r.title + ' · 错题重做');
    };
    main.querySelector('#redo-all').onclick = function () {
      var chs = {}; r.bad.forEach(function (id) { chs[Z.qBy[id].chapterId] = 1; });
      var ids = Z.qList.filter(function (q) { return chs[q.chapterId]; }).map(function (q) { return q.id; });
      startSession('', '', ids.length ? ids : r.bad.slice(), r.title + ' · 重做');
    };
    main.querySelector('#back-dir').onclick = function () { UI.go('#/quiz'); };
  }

  UI.VIEWS.quiz = renderQuizHome;
  UI.VIEWS.qrun = renderRun;
  UI.VIEWS.qres = renderResult;
  window.YL_QUIZ_UI = { startSession: startSession };
})();
