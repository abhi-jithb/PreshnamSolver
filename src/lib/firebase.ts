import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // Replace with your Firebase config
  apiKey: "AIzaSyDvpU0dudMa3dYGR_tOumZS_j7-AOlHIV0",
  authDomain: "preshnam-solver.firebaseapp.com",
  projectId: "preshnam-solver",
  storageBucket: "preshnam-solver.firebasestorage.app",
  messagingSenderId: "817828093321",
  appId: "1:817828093321:web:37eb61f82e6d73b76b9558"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);