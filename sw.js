/* 药理学 · Service Worker（离线优先；核心与导图分缓存）
 * 版本：2.2.0　核心 21 项　导图 102 项
 * 本文件由 build_pwa.py 生成，勿手改。
 */
const CORE = 'yll-yaolixue-v2.2.0';
const IMG = 'yll-yaolixue-img-a8af1578c7';
const CORE_ASSETS = [
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
  "./js/boot.js",
  "./js/cards.js",
  "./js/core.js",
  "./js/kpview.js",
  "./js/misc.js",
  "./js/quizview.js",
  "./js/ui.js",
  "./js/version.js"
];
const IMG_ASSETS = [
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
  "./img/tables/q04.jpg",
  "./img/tables/q05.jpg",
  "./img/tables/q05_2.jpg",
  "./img/tables/q06.jpg",
  "./img/tables/q08.jpg",
  "./img/tables/q09.jpg",
  "./img/tables/q10.jpg",
  "./img/tables/q12.jpg",
  "./img/tables/q13.jpg",
  "./img/tables/q14.jpg",
  "./img/tables/q15.jpg",
  "./img/tables/q16.jpg",
  "./img/tables/q17.jpg",
  "./img/tables/q18.jpg",
  "./img/tables/q19.jpg",
  "./img/tables/q20.jpg",
  "./img/tables/q21.jpg",
  "./img/tables/q22.jpg",
  "./img/tables/q23.jpg",
  "./img/tables/q24.jpg",
  "./img/tables/q25.jpg",
  "./img/tables/q26.jpg",
  "./img/tables/q28.jpg",
  "./img/tables/q29.jpg",
  "./img/tables/q31.jpg",
  "./img/tables/q33.jpg",
  "./img/tables/q34.jpg",
  "./img/tables/q36.jpg",
  "./img/tables/q37.jpg",
  "./img/tables/q38.jpg",
  "./img/tables/q39.jpg",
  "./img/tables/q40.jpg",
  "./img/tables/q41.jpg",
  "./img/tables/q42.jpg",
  "./img/tables/tb0401.jpg",
  "./img/tables/tb0401_2.jpg",
  "./img/tables/tb0402.jpg",
  "./img/tables/tb0402_2.jpg",
  "./img/tables/tb0403.jpg",
  "./img/tables/tb0501.jpg",
  "./img/tables/tb0502.jpg",
  "./img/tables/tb0503.jpg",
  "./img/tables/tb0602.jpg",
  "./img/tables/tb0603.jpg",
  "./img/tables/tb0701.jpg",
  "./img/tables/tb0902.jpg",
  "./img/tables/tb1001.jpg",
  "./img/tables/tb1101.jpg",
  "./img/tables/tb1401.jpg",
  "./img/tables/tb1402.jpg",
  "./img/tables/tb1601.jpg",
  "./img/tables/tb1602.jpg",
  "./img/tables/tb1603.jpg",
  "./img/tables/tb1801.jpg",
  "./img/tables/tb2001.jpg",
  "./img/tables/tb2101.jpg",
  "./img/tables/tb2402.jpg",
  "./img/tables/tb2601.jpg",
  "./img/tables/tb3102.jpg",
  "./img/tables/tb3201.jpg",
  "./img/tables/tb3203.jpg",
  "./img/tables/tb3204.jpg"
];

/* 逐项预缓存：本缓存里已有就跳过（旧版本里同名资源直接复用，不重复下载） */
async function precache(cacheName, urls) {
  const c = await caches.open(cacheName);
  await Promise.all(urls.map(async function (u) {
    try {
      const hit = await c.match(u, { ignoreSearch: true });
      if (hit) return;
      await c.add(new Request(u, { cache: 'reload' }));
    } catch (e) { /* 单个失败不阻塞安装，运行时会自然回填 */ }
  }));
}

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    await precache(IMG, IMG_ASSETS);     // 图片没变时这里几乎零下载
    await precache(CORE, CORE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const keep = { [CORE]: 1, [IMG]: 1 };
    const keys = await caches.keys();
    await Promise.all(keys.map(function (k) {
      if (keep[k]) return null;
      if (k.indexOf('__probe__') === 0) return null;
      return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('message', function (e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 跨域不接管
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
          caches.open(CORE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
