import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";


const firebaseConfig = {
  apiKey: "AIzaSyArdSTx2lUqH3R3upaRdOlxAsRv7SVWVNw",
  authDomain: "habit-tracker-ab447.firebaseapp.com",
  projectId: "habit-tracker-ab447",
  storageBucket: "habit-tracker-ab447.firebasestorage.app",
  messagingSenderId: "400733371714",
  appId: "1:400733371714:web:68e568d8ef5a2975771cdb",
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const requestForToken = async () => {
  try {
    const currentToken = await getToken(messaging, {
      vapidKey:
        "BBUDbqWBD5h35u_X6bNt7WDuAtchq2kjn4WmdF4auhOaW0g-_A8lP3_7R6ptk5lZ4Uf6xZnVnAoyuRwK10aQo4I", // Found in Firebase Console > Messaging > Web Configuration
    });
    if (currentToken) {
      console.log("DEVICE TOKEN SECURED:", currentToken);
      // You will eventually send this to your backend via axios.post
      return currentToken;
    } else {
      console.log(
        "No registration token available. Request permission to generate one."
      );
    }
  } catch (err) {
    console.log("An error occurred while retrieving token. ", err);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
