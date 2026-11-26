// Me Economize — service worker: funciona offline e atualiza sozinho.
const VERSAO = 'v1';
const APP = 'economize-app-' + VERSAO;
const EXTRA = 'economize-extra-' + VERSAO;
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== APP && k !== EXTRA).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Páginas do app: tenta a rede primeiro (pega versões novas), cai no cache se estiver offline.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        const copia = res.clone();
        caches.open(APP).then(c => c.put(req, copia));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Fontes do Google e leitor de PDF (cdnjs): usa o cache e atualiza por trás.
  if (/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.host)) {
    e.respondWith(
      caches.open(EXTRA).then(c => c.match(req).then(hit => {
        const rede = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || rede;
      }))
    );
  }
});
