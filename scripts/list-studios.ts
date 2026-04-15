import admin from 'firebase-admin';
import * as fs from 'fs';

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function run() {
  const studios = await db.collection("studios").get();
  console.log("Studios in DB:", studios.size);
  studios.forEach(d => {
    console.log(`- ID: ${d.id}, Name: ${d.data().name}`);
  });
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
