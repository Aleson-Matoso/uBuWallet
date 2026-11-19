/* Service worker do UbU Wallet.
   Rede primeiro: com internet, sempre carrega a versão publicada mais recente.
   Sem internet, usa a cópia guardada, então o protótipo abre offline.
   Mude VERSION a cada publicação para descartar as cópias antigas. */
var VERSION = 'ubu-v1';
var SHELL = [
  './',
  'i18n.js',
  'protect.js',
  'manifest.webmanifest',
  'favicon.ico',
  'favicon-32.png',
  'favicon-192.png',
  'apple-touch-icon.png',
  'icon-512.png',
  'icon-maskable-192.png',
  'icon-maskable-512.png',
  'assets/foto.png',
  'assets/logo-horizontal.png',
  'assets/logo-icon.png',
  'assets/logo.png',
  'assets/mail.svg',
  'assets/qrcode.png'
];
var FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  /* Fontes do Google: usa a cópia guardada e atualiza em segundo plano */
  if (FONT_HOSTS.indexOf(url.hostname) > -1) {
    e.respondWith(caches.open(VERSION).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* Páginas e arquivos do próprio site: rede primeiro, cópia guardada se estiver offline.
     Qualquer navegação (inclusive /?app=1) cai na página principal guardada. */
  var key = req.mode === 'navigate' ? './' : req;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(key, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(key, { ignoreSearch: true }).then(function (hit) {
        return hit || caches.match('./');
      });
    })
  );
});
