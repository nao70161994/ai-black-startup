"use strict";

const APP_VERSION = "2026.05.24.59";
const CACHE_NAME = "ai-black-startup-" + APP_VERSION;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest?v=20260524-59",
  "./icon.svg?v=20260524-59",
  "./icon-512.png?v=20260524-59",
  "./ogp.svg?v=20260524-59",
  "./ogp.png?v=20260524-59",
  "./assets/characters/ai-ceo.webp?v=20260524-59",
  "./assets/characters/dev-01.webp?v=20260524-59",
  "./assets/characters/sales-02.webp?v=20260524-59",
  "./assets/characters/buzz-03.webp?v=20260524-59",
  "./assets/characters/care-04.webp?v=20260524-59",
  "./assets/characters/fire-05.webp?v=20260524-59",
  "./assets/characters/security-06.webp?v=20260524-59",
  "./assets/office/characters/ai-ceo.webp?v=20260524-59",
  "./assets/office/characters/dev-01.webp?v=20260524-59",
  "./assets/office/characters/sales-02.webp?v=20260524-59",
  "./assets/office/characters/buzz-03.webp?v=20260524-59",
  "./assets/office/characters/care-04.webp?v=20260524-59",
  "./assets/office/characters/fire-05.webp?v=20260524-59",
  "./assets/office/characters/security-06.webp?v=20260524-59",
  "./assets/office/backgrounds/office-level-1.webp?v=20260524-59",
  "./assets/office/backgrounds/office-level-2.webp?v=20260524-59",
  "./assets/office/backgrounds/office-level-3.webp?v=20260524-59",
  "./assets/office/backgrounds/office-level-4.webp?v=20260524-59",
  "./assets/office/backgrounds/office-level-5.webp?v=20260524-59",
  "./assets/products/product-lab-stage.webp?v=20260524-59",
  "./style.css?v=20260524-59",
  "./js/data/balance.js?v=20260524-59",
  "./js/data/employees.js?v=20260524-59",
  "./js/data/characters.js?v=20260524-59",
  "./js/data/products.js?v=20260524-59",
  "./js/data/tasks.js?v=20260524-59",
  "./js/data/strategies.js?v=20260524-59",
  "./js/data/decision-events.js?v=20260524-59",
  "./js/data/achievements.js?v=20260524-59",
  "./js/data/missions.js?v=20260524-59",
  "./js/render/risk.js?v=20260524-59",
  "./js/render/debug.js?v=20260524-59",
  "./js/render/insights.js?v=20260524-59",
  "./js/runtime/legacy-decisions.js?v=20260524-59",
  "./js/runtime/decisions.js?v=20260524-59",
  "./js/runtime/tick.js?v=20260524-59",
  "./js/runtime/effects.js?v=20260524-59",
  "./js/runtime/assignments.js?v=20260524-59",
  "./js/runtime/operations.js?v=20260524-59",
  "./js/runtime/storage.js?v=20260524-59",
  "./js/runtime/state.js?v=20260524-59",
  "./js/runtime/save.js?v=20260524-59",
  "./main.js?v=20260524-59"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf("ai-black-startup-") === 0 && key !== CACHE_NAME;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).then(function (response) {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      });
    })
  );
});
