import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {

  apiKey: "AIzaSyBmhQXw1a0VS9QMifuXFMk4Y1sU0iPNY9E",

  authDomain: "nbccadastroatletas-61e51.firebaseapp.com",

  projectId: "nbccadastroatletas-61e51",

  storageBucket: "nbccadastroatletas-61e51.firebasestorage.app",

  messagingSenderId: "1013891072864",

  appId: "1:1013891072864:web:ad29e3c4828b1135815405"

};




// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
