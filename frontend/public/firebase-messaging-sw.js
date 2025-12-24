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

// 🛑 THERE SHOULD BE NO CODE BELOW THIS LINE.
