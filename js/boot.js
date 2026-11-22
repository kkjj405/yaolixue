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
  UI.tabbar('home');
  function onHash() {
    document.onkeydown = null;
    UI.render();
  }
  window.addEventListener('hashchange', onHash);
  if (!location.hash) { try { history.replaceState(null, '', '#/home'); } catch (e) { location.hash = '#/home'; } }
  UI.render();
})();
