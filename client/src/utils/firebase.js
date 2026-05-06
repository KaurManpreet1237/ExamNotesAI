import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "examcraft-login.firebaseapp.com",
  projectId: "examcraft-login",
  storageBucket: "examcraft-login.firebasestorage.app",
  messagingSenderId: "702477620752",
  appId: "1:702477620752:web:22e11f179cfa79319d5c95"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app)

const provider = new GoogleAuthProvider()

export {auth , provider}