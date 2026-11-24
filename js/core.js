/* 药理学 · 数据层 / 本地存储 / 富文本渲染 / 工具 */
(function () {
  'use strict';
  var MAT = window.YL_MAT || {}, KP = window.YL_KP || {}, QZ = window.YL_QUIZ || {};
  var matBy = {}, kpBy = {}, qBy = {};
  var kidsMap = {};   /* 父 id → 子条目（顺序＝ entries 数组顺序，即教材原文顺序） */
  (MAT.entries || []).forEach(function (e) {
    matBy[e.id] = e;
    if (e.parent) (kidsMap[e.parent] = kidsMap[e.parent] || []).push(e);
  });
  (KP.items || []).forEach(function (e) { kpBy[e.id] = e; });
  (QZ.questions || []).forEach(function (e) { qBy[e.id] = e; });

  /* ---------------- 本地存储 ---------------- */
  var KEY = 'yl.data.v1';
  var DEFAULT = {
    notes: {},          // 通用笔记（教材卡 / 知识点）
    fav: {},            // 通用收藏
    hidden: {},         // 教材卡隐藏
    edits: {},          // 教材卡编辑
    qnotes: {},         // 题目笔记
    qfav: {},           // 题目收藏
    wrong: {},          // 错题本 {qid: 次数}
    rec: {},            // 每题做题痕迹 {qid: {c: 选择/文字, s: 1对/0错}}
    done: {},           // 做题记录 {qid: {n:次数, ok:次数}}
    sessions: {},       // 未完成的刷题会话
    last: { entry: '', kp: '' },
    meta: { ver: '' }
  };
  var store = load();
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      var o = JSON.parse(raw);
      Object.keys(DEFAULT).forEach(function (k) { if (o[k] == null) o[k] = clone(DEFAULT[k]); });
      /* 2.3.0：标题层级重建导致条目 id 位移，按 idmap 把旧数据映射到新 id（只跑一次） */
      var MAP = window.YL_IDMAP;
      if (MAP && o.meta && o.meta.idmap !== '2.3') {
        ['notes', 'fav', 'hidden', 'edits'].forEach(function (k) {
          var src = o[k] || {}, dst = {};
          Object.keys(src).forEach(function (id) { dst[MAP[id] || id] = src[id]; });
          o[k] = dst;
        });
        if (o.last && o.last.entry && MAP[o.last.entry]) o.last.entry = MAP[o.last.entry];
        o.meta.idmap = '2.3';
        try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { }
      }
      return o;
    } catch (e) { return clone(DEFAULT); }
  }
  var timer = null;
  function save(now) {
    if (timer) { clearTimeout(timer); timer = null; }
    if (now) { persist(); return; }
    timer = setTimeout(persist, 150);
  }
  function persist() {
    timer = null;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { }
  }
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') persist();
  });

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function inline(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function nowText(ts) {
    var d = new Date(ts || Date.now());
    function p(n) { return n < 10 ? '0' + n : n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }

  /* ---------------- 富文本块 → HTML ---------------- */
  function cellHTML(s) {
    var x = inline(String(s == null ? '' : s));
    x = x.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
    x = x.replace(/&lt;\/?(sub|sup)&gt;/gi, '');
    x = x.replace(/<\s*br\s*\/?>/gi, '<br>');
    x = x.replace(/\n/g, '<br>');
    return x;
  }
  function tableHTML(bl) {
    // 有原书扫描图时直接用图片（保留合并单元格/结构式），文字表作为兜底
    if (bl.img) {
      return '<figure class="tbl-fig"><img src="' + bl.img + '" alt="' + (bl.cap || '表格') +
        '" loading="lazy" onclick="UI.lightbox(this.getAttribute(\'src\'))"></figure>';
    }
    var h = ['<div class="tbl-wrap"><table><thead><tr>'];
    (bl.head || []).forEach(function (c) { h.push('<th>' + cellHTML(c) + '</th>'); });
    h.push('</tr></thead><tbody>');
    (bl.rows || []).forEach(function (r) {
      h.push('<tr>');
      r.forEach(function (c, ci) { h.push('<td' + (ci === 0 ? ' class="fc"' : '') + '>' + cellHTML(c) + '</td>'); });
      h.push('</tr>');
    });
    h.push('</tbody></table></div>');
    return h.join('');
  }
  function blockHTML(bl) {
    if (!bl || !bl.t) return '';
    switch (bl.t) {
      case 'p': {
        /* 数据里「（1）…」一级被折叠成整行为 <b>…</b>：正文里按小标题渲染（跟着（一）/1. 的层级走） */
        var raw = String(bl.x == null ? '' : bl.x).trim();
        var mb = raw.match(/^<b>([\s\S]+)<\/b>$/);
        if (mb) return '<div class="rich-h lv4">' + inline(mb[1]) + '</div>';
        var x = inline(bl.x).replace(/\n/g, '<br>');
        x = x.replace(/^(主症|兼症|临床表现|适应证|禁忌证|不良反应|注意事项|药理作用|临床应用|体内过程|作用机制)(：)/, '<b class="fl">$1$2</b>');
        return '<p>' + x + '</p>';
      }
      case 'h': return '<div class="rich-h lv' + (bl.lv || 5) + '">' + inline(bl.x) + '</div>';
      case 'q': return '<blockquote>' + inline(bl.x).replace(/\n/g, '<br>') + '</blockquote>';
      case 'ul': return '<ul class="rich-ul">' + (bl.items || []).map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul>';
      case 'ol': return '<div class="rich-ol">' + (bl.items || []).map(function (x) {
        var m = String(x).match(/^(\d+)[.．、)]\s*([\s\S]*)$/);
        return '<div class="ol-i"><span class="ol-n">' + (m ? m[1] + '.' : '·') + '</span><span class="ol-x">' +
          inline(m ? m[2] : x) + '</span></div>';
      }).join('') + '</div>';
      case 'table': return tableHTML(bl);
      case 'img': return '<figure class="rich-img" data-src="' + esc(bl.src) + '"><img src="' + esc(bl.src) +
        '" alt="' + esc(bl.alt || '') + '" loading="lazy" onclick="UI.lightbox(this.getAttribute(\'src\'))">' +
        '<figcaption>' + esc(bl.alt || '') + '</figcaption></figure>';
      case 'hr': return '<hr class="rich-hr">';
      default: return '';
    }
  }
  function renderRich(input) {
    var blocks = Array.isArray(input) ? input : [];
    return blocks.map(blockHTML).join('');
  }
  function blocksText(input) {
    var out = [];
    (input || []).forEach(function (b) {
      if (b.t === 'p' || b.t === 'h' || b.t === 'q') out.push(b.x);
      else if (b.t === 'ul' || b.t === 'ol') out.push((b.items || []).join(' '));
      else if (b.t === 'table') out.push((b.head || []).join(' ') + ' ' + (b.rows || []).map(function (r) { return r.join(' '); }).join(' '));
    });
    return out.join('\n');
  }

  /* ---------------- 编辑：文本 ↔ 块 ---------------- */
  function mdToBlocks(txt) {
    var blocks = [];
    String(txt || "").split(/\r?\n/).forEach(function (line) {
      var t = line.trim();
      if (!t) return;
      if (/^\|/.test(t)) {
        var cells = t.replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) { return c.trim(); });
        if (cells.every(function (c) { return /^:?-{2,}:?$/.test(c) || c === ""; })) return;
        var last = blocks[blocks.length - 1];
        if (last && last.t === "table" && !last._done) { last.head = cells; last._done = 1; }
        else if (last && last.t === "table") { last.rows.push(cells); }
        else blocks.push({ t: "table", head: cells, rows: [] });
        return;
      }
      var m = t.match(/^\*\*(.+)\*\*$/);
      if (m) { blocks.push({ t: "h", lv: 5, x: m[1] }); return; }
      if (/^\d+[.．、)]/.test(t)) { blocks.push({ t: "ol", items: [t] }); return; }
      if (/^[-*]\s+/.test(t)) { blocks.push({ t: "ul", items: [t.replace(/^[-*]\s+/, "")] }); return; }
      if (/^>/.test(t)) { blocks.push({ t: "q", x: t.replace(/^>\s?/, "") }); return; }
      blocks.push({ t: "p", x: t });
    });
    blocks.forEach(function (b) { delete b._done; });
    return blocks;
  }
  function splitSections(blocks) {
    var secs = [], cur = { title: "", blocks: [] };
    (blocks || []).forEach(function (b) {
      if (b.t === "h") { if (cur.title || cur.blocks.length) secs.push(cur); cur = { title: b.x, blocks: [] }; }
      else cur.blocks.push(b);
    });
    if (cur.title || cur.blocks.length) secs.push(cur);
    return secs;
  }
  function joinSections(secs) {
    var out = [];
    secs.forEach(function (sec) {
      if (sec.title) out.push({ t: "h", lv: 5, x: sec.title });
      (sec.blocks || []).forEach(function (b) { out.push(b); });
    });
    return out;
  }

  /* ---------------- 知识要点（含编辑） ---------------- */
  function viewKp(it) {
    var ed = store.edits[it.id] || {};
    return { id: it.id, title: it.title, no: it.no, chapterId: it.chapterId,
      blocks: ed.blocks || it.blocks, hasEdit: !!ed.blocks };
  }

  /* ---------------- 教材卡片 ---------------- */
  function viewEntry(e) {
    var ed = store.edits[e.id] || {};
    var blocks = (ed.blocks || e.blocks || []).slice();
    return {
      id: e.id, kind: e.kind, name: e.name, en: e.en, chapterId: e.chapterId, sectionId: e.sectionId,
      groupId: e.groupId, maps: e.maps || [], blocks: blocks, hasEdit: !!ed.blocks
    };
  }
  function entryExists(id) { return !!matBy[id]; }
  function chapterById(id) { return (MAT.chapters || []).filter(function (c) { return c.id === id; })[0]; }
  function sectionById(id) { return (MAT.sections || []).filter(function (c) { return c.id === id; })[0]; }
  function entryList(chapterId) {
    return (MAT.entries || []).filter(function (e) {
      return e.kind !== 'group' && (!chapterId || e.chapterId === chapterId) && !store.hidden[e.id];
    }).map(function (e) { return e.id; });
  }

  /* ---------------- 目录层级（v2.4.0） ----------------
   * 目录只到「一、」：path 为空的条目 = 目录行（含 本章概述 / 本节概述）。
   * 「（一）」「1.」「（1）」「①」及以下不再作为目录行，改为所属「一、」卡片正文里的层级。
   * 药名仍是独立卡片，但不出现在目录，由「一、」卡片正文里的链接进入。            */
  function isTocEntry(e) { return !!e && (e.path || []).length === 0; }
  function tocEntries(chapterId) {
    return (MAT.entries || []).filter(function (e) {
      return isTocEntry(e) && (!chapterId || e.chapterId === chapterId);
    });
  }
  function childrenOf(id) { return kidsMap[id] || []; }
  function ancestorsOf(id) {
    var out = [], e = matBy[id], guard = 0;
    while (e && e.parent && matBy[e.parent] && guard++ < 12) { e = matBy[e.parent]; out.unshift(e); }
    return out;
  }
  function navSiblings(id) {
    var e = matBy[id]; if (!e) return [];
    if (!e.parent) return tocEntries(e.chapterId);
    return childrenOf(e.parent);
  }
  function navEntry(id, dir) {
    var list = navSiblings(id).filter(function (x) { return !store.hidden[x.id]; });
    var i = list.map(function (x) { return x.id; }).indexOf(id);
    if (i < 0) return '';
    var j = i + dir;
    return (j >= 0 && j < list.length) ? list[j].id : '';
  }

  /* ---------------- 知识要点 ---------------- */
  function kpList(chapterId) {
    return (KP.items || []).filter(function (i) { return !chapterId || i.chapterId === chapterId; }).map(function (i) { return i.id; });
  }
  function navKp(id, dir) {
    var it = kpBy[id]; if (!it) return '';
    var list = kpList(it.chapterId);
    var i = list.indexOf(id), j = i + dir;
    return (j >= 0 && j < list.length) ? list[j] : '';
  }

  /* ---------------- 题库 ---------------- */
  var qList = QZ.questions || [];
  var qIndex = {};
  qList.forEach(function (q, i) { qIndex[q.id] = i; });
  function qChapterOf(q) { return (QZ.chapters || []).filter(function (c) { return c.id === q.chapterId; })[0]; }
  function questionsOf(chapterId, type) {
    return qList.filter(function (q) {
      return (!chapterId || q.chapterId === chapterId) && (!type || q.type === type);
    });
  }
  function isChoice(q) { return q.type === 'A1' || q.type === 'B1' || q.type === 'X'; }
  function optionsOf(q) { return (q.type === 'B1' && q.sharedOptions && q.sharedOptions.length) ? q.sharedOptions : (q.options || []); }
  function sameAnswer(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    var x = a.slice().sort().join(''), y = b.slice().sort().join('');
    return x === y;
  }
  /* ---------------- 做题痕迹（全局，答题卡与答题页共用） ---------------- */
  function qRec(id) { return store.rec[id] || null; }
  function setRec(id, chosen, ok) {
    store.rec[id] = { c: chosen, s: ok ? 1 : 0, ts: Date.now() };
    var d = store.done[id] || { n: 0, ok: 0 };
    d.n++; if (ok) d.ok++;
    store.done[id] = d;
    /* 错题本只增不删：答对不移出，只有用户手动「移除」才删除 */
    if (!ok) store.wrong[id] = (store.wrong[id] || 0) + 1;
    save(true);
  }
  function clearRec(id) {
    /* 清作答痕迹，但错题本成员保留（移出只能走「移除错题」） */
    delete store.rec[id]; delete store.done[id];
    save(true);
  }
  function clearType(chapterId, type) {
    var n = 0;
    (QZ.questions || []).forEach(function (q) {
      if ((!chapterId || q.chapterId === chapterId) && (!type || q.type === type) && store.rec[q.id]) {
        delete store.rec[q.id]; delete store.done[q.id]; n++;
      }
    });
    save(true); return n;
  }
  function typeStats(chapterId, type) {
    var list = questionsOf(chapterId, type), done = 0, right = 0;
    list.forEach(function (q) {
      var r = store.rec[q.id];
      if (r) { done++; if (r.s === 1) right++; }
    });
    return { n: list.length, done: done, right: right };
  }

  function wrongList() {
    return Object.keys(store.wrong).filter(function (id) { return qBy[id]; })
      .sort(function (a, b) { return (store.wrong[b] || 0) - (store.wrong[a] || 0) || (qBy[a].chapterId < qBy[b].chapterId ? -1 : 1); });
  }
  function favQList() { return Object.keys(store.qfav).filter(function (id) { return qBy[id]; }); }

  /* ---------------- 通用笔记 / 收藏 ---------------- */
  function note(id) { return store.notes[id] || ''; }
  function setNote(id, t) { if (t && t.trim()) store.notes[id] = t; else delete store.notes[id]; save(true); }
  function isFav(id) { return !!store.fav[id]; }
  function toggleFav(id) { if (store.fav[id]) delete store.fav[id]; else store.fav[id] = 1; save(true); }
  function isHidden(id) { return !!store.hidden[id]; }
  function setHidden(id, v) { if (v) store.hidden[id] = 1; else delete store.hidden[id]; save(true); }
  function hiddenCount() { return Object.keys(store.hidden).length; }

  /* ---------------- 搜索（教材 + 要点） ----------------
   * 2.4.5：结果分组 + 打分 + 正文摘要。
   *   ① 名字精确 → ② 英文名精确 → ③ 名字前缀 → ④ 名字包含 → ⑤ 英文名包含 → ⑥ 正文出现（按出现次数）
   *   名字命中的条目不会再重复算进「正文提到」。                                    */
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ''); }
  function countOf(hay, needle) {
    if (!needle) return 0;
    var n = 0, i = 0;
    while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
    return n;
  }
  function snippetOf(txt, raw, span) {
    span = span || 26;
    txt = String(txt || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    var i = raw ? txt.toLowerCase().indexOf(String(raw).toLowerCase()) : -1;
    if (i < 0) return { pre: '', mid: '', post: txt.slice(0, span * 2) + (txt.length > span * 2 ? '…' : '') };
    var a = Math.max(0, i - span), b = Math.min(txt.length, i + String(raw).length + span);
    return {
      pre: (a > 0 ? '…' : '') + txt.slice(a, i),
      mid: txt.slice(i, i + String(raw).length),
      post: txt.slice(i + String(raw).length, b) + (b < txt.length ? '…' : '')
    };
  }
  function nameScore(name, en, q) {
    var n = norm(name), e2 = norm(en);
    if (n === q) return 1000;
    if (e2 && e2 === q) return 950;
    if (n.indexOf(q) === 0) return 900;
    if (n.indexOf(q) >= 0) return 800;
    if (e2 && e2.indexOf(q) >= 0) return 700;
    return 0;
  }
  function searchAll(kw) {
    var raw = String(kw == null ? '' : kw).trim();
    var q = norm(raw);
    var out = { q: raw, names: [], bodies: [], kpNames: [], kpBodies: [] };
    if (!q) return out;
    (MAT.entries || []).forEach(function (e) {
      var s = nameScore(e.name, e.en, q);
      if (s) { out.names.push({ e: e, score: s }); return; }
      var txt = blocksText(e.blocks), n = countOf(norm(txt), q);
      if (!n) return;
      out.bodies.push({ e: e, n: n, score: 100 + Math.min(n, 6) * 12 + (e.kind === 'drug' ? 6 : 0), snip: snippetOf(txt, raw) });
    });
    (KP.items || []).forEach(function (i) {
      var s = nameScore(i.title, '', q);
      if (s) { out.kpNames.push({ e: i, score: s }); return; }
      var txt = blocksText(i.blocks), n = countOf(norm(txt), q);
      if (!n) return;
      out.kpBodies.push({ e: i, n: n, score: 100 + Math.min(n, 6) * 12, snip: snippetOf(txt, raw) });
    });
    function cmp(a, b) { return b.score - a.score || (a.e.chapterId < b.e.chapterId ? -1 : a.e.chapterId > b.e.chapterId ? 1 : 0); }
    out.names.sort(cmp); out.bodies.sort(cmp);
    out.kpNames.sort(cmp); out.kpBodies.sort(cmp);
    return out;
  }

  window.YL = {
    MAT: MAT, KP: KP, QZ: QZ, matBy: matBy, kpBy: kpBy, qBy: qBy, qList: qList,
    store: store, save: save, persist: persist,
    esc: esc, inline: inline, shuffle: shuffle, nowText: nowText, clip: clip,
    renderRich: renderRich, blocksText: blocksText,
    mdToBlocks: mdToBlocks, splitSections: splitSections, joinSections: joinSections, viewKp: viewKp,
    viewEntry: viewEntry, entryExists: entryExists, chapterById: chapterById, sectionById: sectionById,
    entryList: entryList, navEntry: navEntry,
    isTocEntry: isTocEntry, tocEntries: tocEntries, childrenOf: childrenOf,
    ancestorsOf: ancestorsOf, navSiblings: navSiblings,
    kpList: kpList, navKp: navKp,
    questionsOf: questionsOf, qChapterOf: qChapterOf, isChoice: isChoice, optionsOf: optionsOf,
    sameAnswer: sameAnswer, wrongList: wrongList, favQList: favQList,
    qRec: qRec, setRec: setRec, clearRec: clearRec, clearType: clearType, typeStats: typeStats,
    note: note, setNote: setNote, isFav: isFav, toggleFav: toggleFav,
    isHidden: isHidden, setHidden: setHidden, hiddenCount: hiddenCount,
    searchAll: searchAll
  };
})();
