/* 药理学 · Service Worker（离线优先，全量预缓存）
 * 版本缓存：2.0.0
 * 资源清单由 build_pwa.py 自动生成，共 61 项。
 */
const CACHE = 'yll-yaolixue-v2.0.0';
const ASSETS = [
  "./app.css",
  "./index.html",
  "./manifest.webmanifest",
  "./qr.jpg",
  "./selftest.html",
  "./css/quiz.css",
  "./data/kp.js",
  "./data/material.js",
  "./data/quiz.js",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon-512.png",
  "./img/kp01.jpg",
  "./img/kp02.jpg",
  "./img/kp03.jpg",
  "./img/kp04.jpg",
  "./img/kp05.jpg",
  "./img/kp06.jpg",
  "./img/kp07.jpg",
  "./img/kp08.jpg",
  "./img/kp09.jpg",
  "./img/kp10.jpg",
  "./img/kp11.jpg",
  "./img/kp12.jpg",
  "./img/kp13.jpg",
  "./img/kp14.jpg",
  "./img/kp15.jpg",
  "./img/kp16.jpg",
  "./img/kp17.jpg",
  "./img/kp18.jpg",
  "./img/kp19.jpg",
  "./img/kp20.jpg",
  "./img/kp21.jpg",
  "./img/kp22.jpg",
  "./img/kp23.jpg",
  "./img/kp24.jpg",
  "./img/kp25.jpg",
  "./img/kp26.jpg",
  "./img/kp27.jpg",
  "./img/kp28.jpg",
  "./img/kp29.jpg",
  "./img/kp30.jpg",
  "./img/kp31.jpg",
  "./img/kp32.jpg",
  "./img/kp33.jpg",
  "./img/kp34.jpg",
  "./img/kp35.jpg",
  "./img/kp36.jpg",
  "./img/kp37.jpg",
  "./img/kp38.jpg",
  "./img/kp39.jpg",
  "./img/kp40.jpg",
  "./js/boot.js",
  "./js/cards.js",
  "./js/core.js",
  "./js/kpview.js",
  "./js/misc.js",
  "./js/quizview.js",
  "./js/ui.js",
  "./js/version.js"
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // 单个资源失败不阻塞整体安装（下次 fetch 时会自然回填）
    return Promise.all(ASSETS.map(function (u) {
      return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 跨域请求不接管
  // version.json / files.json 是「检查更新」用的网络探测文件：
  // 既不在预缓存清单里，也绝不写入缓存，否则永远读到旧版本。
  if (/(^|\/)(version|files)\.json$/.test(url.pathname)) {
    e.respondWith(fetch(new Request(req, { cache: 'no-store' })));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
