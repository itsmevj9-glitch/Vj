import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ---------------------------
// 1️⃣ Define your VAPID key
const VAPID_PUBLIC_KEY =
  "BNYiFa9uM0q9Ius1mg0-7mFeQNiNdUYKKs6RJbvw5fEirhMhcKxtKiGHJyIRfm3FwobRqDtv8eioRuGSxkXoOsI"; // replace with your public key

// 2️⃣ Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ---------------------------
// Register Service Worker & subscribe user
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then(() => {
      console.log("Service Worker registered");

      // Request notification permission
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("Notification permission granted.");

          // Subscribe user to push
          navigator.serviceWorker.ready.then(async (registration) => {
            try {
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
              });

              // Send subscription to your backend
              await fetch("http://localhost:8000/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription),
              });

              console.log("User subscribed for notifications");
            } catch (err) {
              console.error("Subscription failed:", err);
            }
          });
        } else {
          console.log("Notification permission denied.");
        }
      });
    })
    .catch((err) => console.error("Service Worker registration failed:", err));
}

// ---------------------------
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
