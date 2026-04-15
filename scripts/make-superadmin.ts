import admin from 'firebase-admin';
import * as fs from 'fs';

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';
const EMAIL = 'fabriziofarmaceutico@gmail.com';
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function run() {
  const userAuth = await admin.auth().getUserByEmail(EMAIL);
  const uid = userAuth.uid;
  console.log(`Setting Fabrizio (UID: ${uid}) as Super Admin...`);

  await db.collection("users").doc(uid).set({
    role: 'superadmin',
    roles: ['superadmin', 'admin', 'instructor', 'student'],
    full_name: 'Fabrizio Martins',
    email: EMAIL,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  console.log("✅ Done! Fabrizio is now a Super Admin.");
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
