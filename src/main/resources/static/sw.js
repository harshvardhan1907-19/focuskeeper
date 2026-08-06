// ========================================
// SERVICE WORKER - For offline support
// ========================================

const CACHE_NAME = 'focuskeeper-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/dashboard.html',
    '/style/style.css',
    '/style/dashboard.css',
    '/style/index.css',
    '/style/auth.css',
    '/scripts/app.js',
    '/scripts/auth.js',
    '/scripts/dashboard.js',
    '/manifest.json'
];

// Install service worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch cached resources
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version if available, else fetch from network
                return response || fetch(event.request);
            })
    );
});

// Update service worker
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});