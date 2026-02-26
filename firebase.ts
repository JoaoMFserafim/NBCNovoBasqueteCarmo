import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {

  apiKey: "AIzaSyDwsu7W9_fBM6IUlKsY2y2i5bJXI06Y2Ts",

  authDomain: "membrosnbc.firebaseapp.com",

  projectId: "membrosnbc",

  storageBucket: "membrosnbc.firebasestorage.app",

  messagingSenderId: "649738436291",

  appId: "1:649738436291:web:a086f4846cd01b14bbac76",

  measurementId: "G-FPJ51N8P11"


};




// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
