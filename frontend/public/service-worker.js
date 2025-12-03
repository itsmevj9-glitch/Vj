self.addEventListener("push", (event) => {
  const data = event.data.text().split("|"); // "title|body"
  const title = data[0];
  const body = data[1];

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/logo192.png", // or your app icon
    })
  );
});
