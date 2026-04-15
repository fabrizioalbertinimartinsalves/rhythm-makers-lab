import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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
    console.log("Logando...");
    const cred = await signInWithEmailAndPassword(auth, "fabriziofarmaceutico@gmail.com", process.env.ADMIN_PASSWORD || "");
    
    console.log("Criando documento no Firestore (users)...");
    await setDoc(doc(db, "users", cred.user.uid), {
      role: "superadmin",
      studioId: "studio-master",
      email: cred.user.email,
      nome: "Fabrizio",
      createdAt: new Date().toISOString()
    });
    
    console.log("Criando documento de studio (studios)...");
    await setDoc(doc(db, "studios", "studio-master"), {
      nome: "Studio Principal (Master)",
      ativa: true,
      createdAt: new Date().toISOString()
    });
    
    console.log("Feito! superadmin vinculado com sucesso!");
    process.exit(0);
  } catch (err: any) {
    console.error("Erro:", err);
    process.exit(1);
  }
}

run();
