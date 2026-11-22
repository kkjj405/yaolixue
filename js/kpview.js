/* 药理学 · 知识要点（导图 + 表格 + 目录） */
(function () {
  'use strict';
  var Z = window.YL, UI = window.YL_UI;
  var esc = Z.esc, icon = UI.icon;

  function renderKp(main) {
    UI.header({ title: '知识要点', sub: Z.KP.stats.chapters + ' 章 · ' + Z.KP.stats.items + ' 条' });
    var h = [];
    h.push('<div class="card flat"><p class="small muted" style="margin:0">按章集中的知识点：思维导图 ' +
      Z.KP.stats.images + ' 张、表格 ' + Z.KP.stats.tables + ' 个。点章节查看。</p></div>');
    (Z.KP.chapters || []).forEach(function (c) {
      var items = c.itemIds.length;
      h.push('<div class="chap open" data-kpchap="' + c.id + '"><div class="chap-hd"><span class="cn">' +
        esc(c.no) + '　' + esc(c.name) + '</span><span class="chip gray tiny">' + items + ' 条</span></div><div class="chap-bd">' +
        c.itemIds.map(function (id) {
          var it = Z.kpBy[id];
          var nb = (it.blocks || []).filter(function (b) { return b.t === 'img'; }).length;
          var nt = (it.blocks || []).filter(function (b) { return b.t === 'table'; }).length;
          return '<a class="er" href="#/kpi/' + it.id + '"><span class="er-kind kp">要</span><span class="er-nm">' +
            esc(it.title) + '</span>' + (nb ? '<span class="flag" title="含导图">◈' + nb + '</span>' : '') +
            (nt ? '<span class="flag" title="含表格">▦' + nt + '</span>' : '') +
            (Z.isFav(id) ? '<span class="flag gold">☆</span>' : '') + '</a>';
        }).join('') + '</div></div>');
    });
    main.innerHTML = h.join('');
    main.querySelectorAll('[data-kpchap] .chap-hd').forEach(function (hd) {
      hd.onclick = function () { hd.closest('[data-kpchap]').classList.toggle('open'); };
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
    main.querySelector('#k-prev').onclick = function () { if (prev) UI.replaceHash('#/kpi/' + prev); };
    main.querySelector('#k-next').onclick = function () { if (next) UI.replaceHash('#/kpi/' + next); };
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
  UI.VIEWS.kpi = renderKpi;
})();
