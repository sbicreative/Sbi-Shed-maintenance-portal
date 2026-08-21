const CACHE_NAME = "sbi-shed-shell-v6";
const APP_SHELL = [
    "/", "/portal.html", "/tracking/", "/tracking/index.html",
    "/dashboard/login.html", "/dashboard/assign-work.html", "/dashboard/incharge.html",
    "/dashboard/manpower-distribution.html", "/dashboard/schedule-form.html",
    "/dashboard/supervisor.html", "/dashboard/viewer.html", "/dashboard/staff.html",
    "/css/portal.css", "/css/pwa-responsive.css", "/tracking/tracking.css", "/tracking/tracking.js",
    "/js/portal.js", "/js/pwa.js", "/manifest.webmanifest",
    "/images/app-icon.svg", "/images/IR-logo.jpeg", "/images/SBI-logo.jpeg", "/images/sbi-shed-hero.jpeg"
];

self.addEventListener("install", event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )));
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET" || request.url.includes("/api/")) return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        if (url.hostname === "cdn.jsdelivr.net" || url.hostname === "cdnjs.cloudflare.com") {
            event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
                caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
                return response;
            })));
        }
        return;
    }
    event.respondWith(fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
    }).catch(() => caches.match(request).then(cached => cached || caches.match("/portal.html"))));
});
