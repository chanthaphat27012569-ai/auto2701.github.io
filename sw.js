/* ============================================================
   SMS · Service Worker (PWA offline support)
   ระบบบริหารจัดการสถานศึกษา — static app, localStorage only
   ============================================================ */
const SW_VERSION = '3.9.10';
const CACHE_NAME = 'sms-v' + SW_VERSION;
const RUNTIME_CACHE = 'sms-runtime-v' + SW_VERSION;

/* ไฟล์หลักที่ต้องมีติดเครื่องไว้ใช้ตอนออฟไลน์ */
const PRECACHE = [
  './',
  './index.html',
  './admin.html',
  './student.html',
  './club-community.html',
  './print.html',
  './manifest.json',
  './favicon.ico',
  './css/style.css',
  './css/admin.css',
  './css/modules.css',
  './css/portal.css',
  './css/schedule.css',
  './css/print.css',
  './assets/fonts/itim-thai.woff2',
  './assets/fonts/itim-latin.woff2',
  './js/data.js',
  './js/modal.js',
  './js/admin.js',
  './js/print.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

const OFFLINE_HTML = '<!doctype html><html lang="th"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>ออฟไลน์ · SMS</title><style>' +
  '@font-face{font-family:"Itim";font-style:normal;font-weight:400;font-display:swap;src:url("./assets/fonts/itim-thai.woff2") format("woff2");unicode-range:U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC}' +
  '@font-face{font-family:"Itim";font-style:normal;font-weight:400;font-display:swap;src:url("./assets/fonts/itim-latin.woff2") format("woff2")}' +
  'html,body{margin:0;height:100%;font-family:"Itim","Sarabun",system-ui,-apple-system,"Segoe UI",sans-serif;background:#f4f6fb;color:#1e293b}' +
  '.wrap{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:24px}' +
  '.ico{width:76px;height:76px;border-radius:22px;background:linear-gradient(140deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;box-shadow:0 18px 32px -18px rgba(79,70,229,.9)}' +
  'h1{font-size:1.15rem;margin:0}p{margin:0;color:#64748b;font-size:.88rem;max-width:340px;line-height:1.7}' +
  'button{margin-top:8px;border:0;border-radius:12px;padding:11px 22px;background:#4f46e5;color:#fff;font:inherit;font-weight:700;cursor:pointer}' +
  'button:active{transform:scale(.97)}' +
  '</style></head><body><div class="wrap"><div class="ico">⌂</div>' +
  '<h1>ไม่มีการเชื่อมต่ออินเทอร์เน็ต</h1>' +
  '<p>หน้านี้ยังไม่มีข้อมูลแคชในเครื่อง ลองเชื่อมต่ออีกครั้งแล้วเปิดใหม่อีกครั้ง — ข้อมูลที่บันทึกไว้ในเครื่องยังปลอดภัย</p>' +
  '<button onclick="location.reload()">ลองอีกครั้ง</button></div></body></html>';

/* ---------- install ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      /* ใส่ทีละไฟล์ เพื่อไม่ให้ไฟล์ใดไฟล์หนึ่งพลาดแล้วทั้งชุด INSTALL FAIL */
      return Promise.all(PRECACHE.map((url) =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
      ));
    }).then(() => self.skipWaiting())
  );
});

/* ---------- activate ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => {
      if (key !== CACHE_NAME && key !== RUNTIME_CACHE) return caches.delete(key);
      return null;
    }))).then(() => self.clients.claim())
  );
});

/* ---------- helpers ---------- */
function isSameOrigin(url) {
  try { return new URL(url, self.location.href).origin === self.location.origin; } catch (e) { return false; }
}

function cachePut(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return response;
  const copy = response.clone();
  caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
  return response;
}

/* network-first + cache fallback (เหมาะกับ HTML/CSS/JS ที่ต้องอัปเดตเสมอ) */
function networkFirst(request, fallbackUrl) {
  return fetch(request).then((response) => cachePut(request, response)).catch(() =>
    caches.match(request).then((hit) => {
      if (hit) return hit;
      if (fallbackUrl) return caches.match(fallbackUrl).then((fb) => fb || offlineResponse());
      return offlineResponse();
    })
  );
}

/* cache-first (เหมาะกับรูปภาพ/ไอคอน/ฟอนต์) */
function cacheFirst(request) {
  return caches.match(request).then((hit) => {
    if (hit) return hit;
    return fetch(request).then((response) => cachePut(request, response)).catch(() => offlineResponse());
  });
}

function offlineResponse() {
  return new Response(OFFLINE_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/* ---------- fetch ---------- */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (!isSameOrigin(request.url)) return;
  if (request.url.indexOf('/sw.js') !== -1) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  const url = new URL(request.url);
  const dest = request.destination;
  if (dest === 'image' || dest === 'font' || /\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (dest === 'style' || dest === 'script' || /\.(css|js)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (/\.(json)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

/* ---------- messages (อัปเดตเวอร์ชันใหม่) ---------- */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'GET_VERSION') {
    const port = event.ports && event.ports[0];
    if (port) port.postMessage({ version: SW_VERSION, cache: CACHE_NAME });
  }
});
