/* 药理学 · 知识要点（导图 + 表格 + 目录） */
(function () {
  'use strict';
  var Z = window.YL, UI = window.YL_UI;
  var esc = Z.esc, icon = UI.icon;

  function renderKp(main) {
    UI.header({ title: '知识要点', sub: Z.KP.stats.chapters + ' 章 · ' + Z.KP.stats.items + ' 条' });
    var h = ['<div class="card flat"><p class="small muted" style="margin:0">按章看全：导图 ' +
      Z.KP.stats.images + ' 张、表格 ' + Z.KP.stats.tables + ' 个，点章节进入。</p></div>'];
    (Z.KP.chapters || []).forEach(function (c, i) {
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
      var it = Z.kpBy[id];
      h.push('<div class="card kp-item" id="kp-' + it.id + '"><div class="kp-hd"><span class="kp-no">' + (it.no || '') +
        '</span><span class="kp-t">' + esc(it.title) + '</span>' +
        '<button class="btn xs ghost" data-kpfav="' + it.id + '">' + (Z.isFav(it.id) ? '★ 已藏' : '☆ 收藏') + '</button></div>' +
        '<div class="rich">' + Z.renderRich(it.blocks) + '</div></div>');
    });
    main.innerHTML = h.join('');
    bindImgs(main);
    main.querySelectorAll('[data-kpfav]').forEach(function (b) {
      b.onclick = function () { Z.toggleFav(b.getAttribute('data-kpfav')); UI.render(); };
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
