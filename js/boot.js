/* 药理学 · 启动 */
(function () {
  'use strict';
  var Z = window.YL, UI = window.YL_UI;
  if (!Z || !UI) return;
  var VER = window.YL_VERSION || { web: '1.0.0' };
  try {
    if (Z.store.meta.ver && Z.store.meta.ver !== VER.web) setTimeout(function () { UI.toast('已更新到 v' + VER.web); }, 600);
    Z.store.meta.ver = VER.web;
    Z.save();
  } catch (e) { }
  /* 新版本 Service Worker 接管后自动刷新一次（避免「下载完了但页面还是旧的」）。
     只在本页加载时就已被 SW 控制的情况下才刷新：首次安装时 clients.claim 也会触发
     controllerchange，那时不该刷新页面。 */
  var hadController = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
  if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) {
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || window.__ylReloading) return;
      window.__ylReloading = true;
      setTimeout(function () { location.reload(); }, 300);
    });
  }
  UI.tabbar('home');
  function onHash() {
    document.onkeydown = null;
    UI.render();
  }
  window.addEventListener('hashchange', onHash);
  if (!location.hash) { try { history.replaceState(null, '', '#/home'); } catch (e) { location.hash = '#/home'; } }
  UI.render();
})();
