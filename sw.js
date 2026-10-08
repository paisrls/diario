/* Service worker: rende l'app utilizzabile offline. Cambia VERSION a ogni aggiornamento. */
const VERSION = 'diario-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  "./img/esercizi/Barbell_Bench_Press_-_Medium_Grip_0.jpg",
  "./img/esercizi/Barbell_Bench_Press_-_Medium_Grip_1.jpg",
  "./img/esercizi/Barbell_Deadlift_0.jpg",
  "./img/esercizi/Barbell_Deadlift_1.jpg",
  "./img/esercizi/Barbell_Hip_Thrust_0.jpg",
  "./img/esercizi/Barbell_Hip_Thrust_1.jpg",
  "./img/esercizi/Barbell_Squat_0.jpg",
  "./img/esercizi/Barbell_Squat_1.jpg",
  "./img/esercizi/Bent_Over_Barbell_Row_0.jpg",
  "./img/esercizi/Bent_Over_Barbell_Row_1.jpg",
  "./img/esercizi/Cable_Crunch_0.jpg",
  "./img/esercizi/Cable_Crunch_1.jpg",
  "./img/esercizi/Close-Grip_Front_Lat_Pulldown_0.jpg",
  "./img/esercizi/Close-Grip_Front_Lat_Pulldown_1.jpg",
  "./img/esercizi/Dumbbell_Bicep_Curl_0.jpg",
  "./img/esercizi/Dumbbell_Bicep_Curl_1.jpg",
  "./img/esercizi/Dumbbell_Shoulder_Press_0.jpg",
  "./img/esercizi/Dumbbell_Shoulder_Press_1.jpg",
  "./img/esercizi/Face_Pull_0.jpg",
  "./img/esercizi/Face_Pull_1.jpg",
  "./img/esercizi/Incline_Dumbbell_Press_0.jpg",
  "./img/esercizi/Incline_Dumbbell_Press_1.jpg",
  "./img/esercizi/Leg_Extensions_0.jpg",
  "./img/esercizi/Leg_Extensions_1.jpg",
  "./img/esercizi/Leg_Press_0.jpg",
  "./img/esercizi/Leg_Press_1.jpg",
  "./img/esercizi/Lying_Leg_Curls_0.jpg",
  "./img/esercizi/Lying_Leg_Curls_1.jpg",
  "./img/esercizi/Pullups_0.jpg",
  "./img/esercizi/Pullups_1.jpg",
  "./img/esercizi/Romanian_Deadlift_0.jpg",
  "./img/esercizi/Romanian_Deadlift_1.jpg",
  "./img/esercizi/Seated_Cable_Rows_0.jpg",
  "./img/esercizi/Seated_Cable_Rows_1.jpg",
  "./img/esercizi/Side_Lateral_Raise_0.jpg",
  "./img/esercizi/Side_Lateral_Raise_1.jpg",
  "./img/esercizi/Split_Squat_with_Dumbbells_0.jpg",
  "./img/esercizi/Split_Squat_with_Dumbbells_1.jpg",
  "./img/esercizi/Standing_Calf_Raises_0.jpg",
  "./img/esercizi/Standing_Calf_Raises_1.jpg",
  "./img/esercizi/Triceps_Pushdown_0.jpg",
  "./img/esercizi/Triceps_Pushdown_1.jpg",
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rete prima per i file dell'app (così gli aggiornamenti arrivano), cache se offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const isImage = url.pathname.includes('/img/');
  if (isImage) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
