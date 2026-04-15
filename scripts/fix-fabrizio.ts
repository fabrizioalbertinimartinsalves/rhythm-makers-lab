import admin from 'firebase-admin';
import * as fs from 'fs';

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';
const EMAIL = 'fabriziofarmaceutico@gmail.com';
const STUDIO_ID = 'XBlEeXavaBF5Di3yE2qG'; // Ateliê do Corpo Dani Lage

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function run() {
  const userAuth = await admin.auth().getUserByEmail(EMAIL);
  const uid = userAuth.uid;
  
  console.log(`Linking UID ${uid} to Studio ${STUDIO_ID} as admin...`);
  
  // 1. Criar/Atualizar documento na coleção 'users'
  await db.collection('users').doc(uid).set({
    full_name: 'Fabrizio Martins',
    email: EMAIL,
    role: 'admin',
    studioId: STUDIO_ID,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // 2. Criar registro na coleção 'user_memberships'
  // Usar uma query para ver se já existe antes de criar duplicado
  const existing = await db.collection('user_memberships')
    .where('userId', '==', uid)
    .where('studioId', '==', STUDIO_ID)
    .get();

  if (existing.empty) {
    await db.collection('user_memberships').add({
      userId: uid,
      studioId: STUDIO_ID,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("✅ Membership created successfully!");
  } else {
    console.log("⚠️ Membership already exists.");
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
