// public/sw.js
self.addEventListener("push", function (event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/logo.png", // path to your icon
    badge: "/badge.png", // path to your badge
    vibrate: [100, 50, 100],
    data: {
      url: data.url,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
