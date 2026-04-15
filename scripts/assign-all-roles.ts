import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: "atelie-9df54.firebaseapp.com",
  projectId: "atelie-9df54",
  storageBucket: "atelie-9df54.firebasestorage.app",
  messagingSenderId: "892080455166",
  appId: "1:892080455166:web:6cd4c3bb1a61c712da54af"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    console.log("Logando como fabriziofarmaceutico@gmail.com...");
    const cred = await signInWithEmailAndPassword(auth, "fabriziofarmaceutico@gmail.com", process.env.ADMIN_PASSWORD || "");
    
    console.log("Atualizando papéis no Firestore...");
    await updateDoc(doc(db, "users", cred.user.uid), {
      roles: ["superadmin", "admin", "instructor", "student"], // Usando array com todos os papéis
      role: null // resetando fallback
    });
    
    console.log("Feito! Todos os papéis associados com sucesso!");
    process.exit(0);
  } catch (err: any) {
    console.error("Erro:", err);
    process.exit(1);
  }
}

run();
