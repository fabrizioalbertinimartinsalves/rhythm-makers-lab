// Custom service worker additions for notification click handling

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Focus or open the app when notification is clicked
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If there's already an open window, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
  );
});

