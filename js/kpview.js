/* 药理学 · 知识要点（导图 + 表格 + 目录） */
(function () {
  'use strict';
  var Z = window.YL, UI = window.YL_UI;
  var esc = Z.esc, icon = UI.icon;

  function renderKp(main) {
    UI.header({ title: '知识要点', sub: Z.KP.stats.chapters + ' 章 · ' + Z.KP.stats.items + ' 条' });
    var h = ['<div class="card flat"><p class="small muted" style="margin:0">按章看全：导图 ' +
      Z.KP.stats.images + ' 张、表格 ' + Z.KP.stats.tables + ' 个，点章节进入。</p></div>'];
    /* 篇分组：按原书目录的章号区间（1-3 总论 / 4-7 外周神经 / …） */
    var PARTS = [
      ['第一篇', '总论', 1, 3],
      ['第二篇', '外周神经系统药理学', 4, 7],
      ['第三篇', '中枢神经系统药理学', 8, 12],
      ['第四篇', '心血管系统药理学', 13, 18],
      ['第五篇', '抗炎免疫、自体活性物质药理学', 19, 21],
      ['第六篇', '内分泌、生殖与代谢药理学', 22, 27],
      ['第七篇', '影响其他系统药物药理学', 28, 30],
      ['第八篇', '化学治疗药物药理学', 31, 99]
    ];
    function partOf(num) {
      for (var i = 0; i < PARTS.length; i++) {
        if (num >= PARTS[i][2] && num <= PARTS[i][3]) return PARTS[i][0] + ' ' + PARTS[i][1];
      }
      return null;
    }
    var lastPart = null;
    (Z.KP.chapters || []).forEach(function (c, i) {
      var pn = partOf(c.num);
      if (pn && pn !== lastPart) {
        lastPart = pn;
        h.push('<div class="kp-part">' + esc(pn) + '</div>');
      }
      var imgs = 0, tabs = 0;
      c.itemIds.forEach(function (id) {
        var it = Z.kpBy[id] || {};
        (it.blocks || []).forEach(function (b) { if (b.t === 'img') imgs++; if (b.t === 'table') tabs++; });
      });
      h.push('<a class="kp-chap" href="#/kpch/' + c.id + '"><span class="kc-no">' + (i + 1) + '</span>' +
        '<span class="kc-bd"><span class="kc-t">' + esc(c.name) + '</span>' +
        '<span class="kc-s">' + c.itemIds.length + ' 条' + (imgs ? ' · 导图 ' + imgs : '') + (tabs ? ' · 表 ' + tabs : '') + '</span></span>' +
        '<span class="at-go">›</span></a>');
    });
    main.innerHTML = h.join('');
    bindImgs(main);
  }

  function bindImgs(main) {
    main.querySelectorAll('.rich-img img').forEach(function (img) {
      img.onclick = function () { UI.lightbox(img.getAttribute('src')); };
    });
  }

  function renderKpChapter(main, p) {
    var c = (Z.KP.chapters || []).filter(function (x) { return x.id === p[0]; })[0];
    if (!c) { main.innerHTML = UI.emptyBox('章节不存在'); return; }
    UI.header({ title: c.name, sub: '知识要点', back: true, backTo: '#/kp' });
    var h = [];
    c.itemIds.forEach(function (id) {
      var raw = Z.kpBy[id], it = Z.viewKp(raw);
      h.push('<div class="card kp-item" id="kp-' + it.id + '"><div class="kp-hd"><span class="kp-no">' + (it.no || '') +
        '</span><span class="kp-t">' + esc(it.title) + '</span>' +
        (it.hasEdit ? '<span class="chip gray tiny">已修改</span>' : '') +
        '<button class="btn xs ghost" data-kpedit="' + it.id + '">编辑</button>' +
        '<button class="btn xs ghost" data-kpfav="' + it.id + '">' + (Z.isFav(it.id) ? '★ 已藏' : '☆ 收藏') + '</button></div>' +
        '<div class="rich">' + Z.renderRich(it.blocks) + '</div><div class="kp-panel" id="kppanel-' + it.id + '"></div></div>');
    });
    main.innerHTML = h.join('');
    bindImgs(main);
    main.querySelectorAll('[data-kpfav]').forEach(function (b) {
      b.onclick = function () { Z.toggleFav(b.getAttribute('data-kpfav')); UI.render(); };
    });
    main.querySelectorAll('[data-kpedit]').forEach(function (b) {
      b.onclick = function () {
        var it = Z.viewKp(Z.kpBy[b.getAttribute('data-kpedit')]);
        var host = document.getElementById('kppanel-' + it.id);
        var secs = Z.splitSections(it.blocks);
        host.innerHTML = '<div class="panel"><div class="p-hd"><span>编辑「' + esc(it.title) + '」</span>' +
          '<button class="btn xs ghost" data-kpc="close">收起</button></div>' +
          '<p class="tiny dim">分段编辑，一行一段；| a | b | 为表格；仅本机生效。</p>' +
          secs.map(function (sec, i) {
            return '<div class="ef"><label>' + (sec.title ? esc(sec.title) : (i === 0 ? '开头' : '第 ' + (i + 1) + ' 段')) +
              '</label><textarea class="textarea ef-ta" data-sec="' + i + '">' + esc(Z.blocksText(sec.blocks)) + '</textarea></div>';
          }).join('') +
          '<div class="p-ft"><button class="btn sm" data-kpc="reset">恢复原文</button>' +
          '<button class="btn sm primary" data-kpc="save">保存修改</button></div></div>';
        host.querySelector('[data-kpc="close"]').onclick = function () { host.innerHTML = ''; };
        host.querySelector('[data-kpc="reset"]').onclick = function () {
          delete Z.store.edits[it.id]; Z.save(true); UI.toast('已恢复原文'); UI.render();
        };
        host.querySelector('[data-kpc="save"]').onclick = function () {
          var out = [], changed = false;
          host.querySelectorAll('.ef-ta').forEach(function (ta) {
            var i = +ta.getAttribute('data-sec');
            var nb = Z.mdToBlocks(ta.value);
            if ((ta.value || '').trim() !== Z.blocksText(secs[i].blocks).trim()) changed = true;
            out.push({ title: secs[i].title, blocks: nb });
          });
          if (!changed) { UI.toast('没有改动'); return; }
          Z.store.edits[it.id] = { blocks: Z.joinSections(out) };
          Z.save(true); UI.toast('已保存（仅本机）'); host.innerHTML = ''; UI.render();
        };
      };
    });
  }

  function renderKpi(main, p) {
    var it = Z.kpBy[p[0]];
    if (!it) { main.innerHTML = UI.emptyBox('知识点不存在'); return; }
    var ch = (Z.KP.chapters || []).filter(function (c) { return c.id === it.chapterId; })[0];
    UI.header({ title: it.title, sub: ch ? ch.no + ' ' + ch.name : '', back: true, backTo: '#/kp' });
    var h = ['<div class="card card-main"><div class="ct-hd"><div class="ct-name">' + esc(it.title) + '</div>' +
      '<div class="ct-sub">' + esc(ch ? ch.no + ' ' + ch.name : '') + '</div></div>' +
      '<div class="ct-body rich">' + Z.renderRich(it.blocks) + '</div>' +
      '<div class="ct-acts"><button class="btn sm" data-act="note">' + icon('note') + '笔记</button>' +
      '<button class="btn sm' + (Z.isFav(it.id) ? ' on' : '') + '" data-act="fav">' + icon('star') +
      (Z.isFav(it.id) ? '已藏' : '收藏') + '</button></div><div id="card-panel"></div></div>'];
    var prev = Z.navKp(it.id, -1), next = Z.navKp(it.id, 1);
    h.push('<div class="pager-row"><button class="btn sm" id="k-prev"' + (prev ? '' : ' disabled') + '>‹ 上一条</button>' +
      '<button class="btn sm" id="k-next"' + (next ? '' : ' disabled') + '>下一条 ›</button></div>');
    main.innerHTML = h.join('');
    Z.store.last.kp = it.id; Z.save();
    main.querySelectorAll('.rich-img img').forEach(function (img) {
      img.onclick = function () { UI.lightbox(img.getAttribute('src')); };
    });
    main.querySelector('#k-prev').onclick = function () { if (prev) UI.replaceHash('#/kpi/' + prev); };
    main.querySelector('#k-next').onclick = function () { if (next) UI.replaceHash('#/kpi/' + next); };
    bindImgs(main);
    main.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-act');
        var host = document.getElementById('card-panel');
        if (k === 'note') {
          host.innerHTML = '<div class="panel"><div class="p-hd"><span>笔记</span><button class="btn xs ghost" data-pc="close">收起</button></div>' +
            '<textarea class="textarea" id="note-txt">' + esc(Z.note(it.id)) + '</textarea>' +
            '<div class="p-ft"><button class="btn sm primary" data-pc="save">保存</button></div></div>';
          host.querySelector('[data-pc="close"]').onclick = function () { host.innerHTML = ''; };
          host.querySelector('[data-pc="save"]').onclick = function () { Z.setNote(it.id, host.querySelector('#note-txt').value); UI.toast('已保存'); host.innerHTML = ''; };
        } else { Z.toggleFav(it.id); UI.render(); }
      };
    });
  }

  UI.VIEWS.kp = renderKp;
  UI.VIEWS.kpch = renderKpChapter;
  UI.VIEWS.kpi = renderKpi;
})();
