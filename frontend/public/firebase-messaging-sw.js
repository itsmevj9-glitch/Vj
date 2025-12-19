// public/firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyArdSTx2lUqH3R3upaRdOlxAsRv7SVWVNw",
  authDomain: "habit-tracker-ab447.firebaseapp.com",
  projectId: "habit-tracker-ab447",
  storageBucket: "habit-tracker-ab447.firebasestorage.app",
  messagingSenderId: "400733371714",
  appId: "1:400733371714:web:68e568d8ef5a2975771cdb",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// THIS IS THE KEY: We don't add a 'fetch' listener here
// so the browser can load vite.svg and other files normally.

messaging.onBackgroundMessage((payload) => {
  console.log("[sw.js] Background message received", payload);

  const notificationTitle = payload.notification.title || "QuestHacker Alert";
  const notificationOptions = {
    body: payload.notification.body || "Time to execute your mission!",
    icon: "/favicon.ico",
    badge: "/favicon.ico", // Small icon for mobile status bars
    tag: "quest-alert", // Prevents multiple popups for the same thing
    renotify: true,
  };

  // This is the command that actually shows the popup while the browser is closed
  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});
