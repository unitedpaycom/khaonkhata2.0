/* eslint-disable no-undef */
// Firebase Cloud Messaging background service worker for KhaonKhata
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBj025jce7qLDKGzwWecaOHkFBWe5s7tPc",
  authDomain: "khaonkhata.firebaseapp.com",
  projectId: "khaonkhata",
  storageBucket: "khaonkhata.firebasestorage.app",
  messagingSenderId: "433133662711",
  appId: "1:433133662711:web:7d78eb1b63db1edf81bef2",
  measurementId: "G-BLVPSX0852"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background push received:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'KhaonKhata (খাওনখাতা)';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'মিল বা মেসের নতুন আপডেট এসেছে।',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data || {},
    tag: payload.data?.tag || 'khaonkhata-meal',
    renotify: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
