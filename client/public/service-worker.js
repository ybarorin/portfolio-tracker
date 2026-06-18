// Service Worker for background notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installing…');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating…');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  if (type === 'SHOW_NOTIFICATION') {
    const { title, symbol, level, price, notifType } = data;

    let tag = `${notifType}-${symbol}`;
    let body = '';
    let icon = '/icon-192.png';
    let badge = '/icon-192.png';

    if (notifType === 'tp-hit') {
      body = `המניה ${symbol} הגיעה ל-TP: ${level}$ (מחיר נוכחי: ${price}$)`;
    } else if (notifType === 'sl-hit') {
      body = `המניה ${symbol} הגיעה ל-SL: ${level}$ (מחיר נוכחי: ${price}$)`;
    }

    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      requireInteraction: true,
      timestamp: Date.now(),
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
