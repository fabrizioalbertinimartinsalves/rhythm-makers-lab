import admin from 'firebase-admin';
import * as fs from 'fs';

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function run() {
  const BROKEN_ID = 'bZIJsqpIecnn5VTDOmGn';
  console.log(`Deleting broken membership ${BROKEN_ID}...`);
  await db.collection("user_memberships").doc(BROKEN_ID).delete();
  console.log("Deleted.");
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
