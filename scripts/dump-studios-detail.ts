import admin from 'firebase-admin';
import * as fs from 'fs';

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection("studios").get();
  console.log(`Studios in DB: ${snapshot.size}`);
  
  snapshot.forEach(doc => {
    console.log(`ID: ${doc.id}`);
    console.log(`DATA: ${JSON.stringify(doc.data(), null, 2)}`);
    console.log('---');
  });
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
