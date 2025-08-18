// Nome do cache
const CACHE_NAME = 'flowcash-cache-v1';

// Arquivos que serão armazenados em cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Icon.png',
  '/Stile.css',
  '/Code.js',
  '/icons/icon-192x192.png',  // Ícones (se você os tiver)
  '/icons/icon-512x512.png'
];

// Durante a instalação do Service Worker, armazenamos os arquivos em cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);  // Adiciona os arquivos ao cache
    })
  );
});

// Durante a ativação do Service Worker, removemos caches antigos
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];  // Lista dos caches que devem ser mantidos

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);  // Remove caches antigos
          }
        })
      );
    })
  );
});

// Quando o navegador faz uma requisição, procuramos no cache primeiro
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);  // Se não estiver em cache, faz a requisição normalmente
    })
  );
});
