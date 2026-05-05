import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "authexamcraft.firebaseapp.com",
  projectId: "authexamcraft",
  storageBucket: "authexamcraft.firebasestorage.app",
  messagingSenderId: "752709211875",
  appId: "1:752709211875:web:90617b231446a7e0b4d7d6"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app)

const provider = new GoogleAuthProvider()

export {auth , provider}