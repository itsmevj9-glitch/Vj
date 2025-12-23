import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Keep this if you have global styles

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  
  <App />
  
);

// --- THE CRITICAL PART FOR OFFLINE NOTIFICATIONS ---
if ("serviceWorker" in navigator) {
  // We register the specific Firebase file we created earlier
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((registration) => {
      console.log("✅ Service Worker Registered. Scope:", registration.scope);
    })
    .catch((err) => {
      console.error("❌ Service Worker Registration Failed:", err);
    });
}
