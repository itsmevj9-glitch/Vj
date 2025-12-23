// public/firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

// 1. YOUR FIREBASE CONFIG (Copy this from src/lib/firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyArdSTx2lUqH3R3upaRdOlxAsRv7SVWVNw",
  authDomain: "habit-tracker-ab447.firebaseapp.com",
  projectId: "habit-tracker-ab447",
  storageBucket: "habit-tracker-ab447.firebasestorage.app",
  messagingSenderId: "400733371714",
  appId: "1:400733371714:web:68e568d8ef5a2975771cdb",
};

// 2. Initialize Firebase in the background
firebase.initializeApp(firebaseConfig);

// 3. Retrieve the messaging instance
const messaging = firebase.messaging();
