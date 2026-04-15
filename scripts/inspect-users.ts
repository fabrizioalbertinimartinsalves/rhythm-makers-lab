import admin from 'firebase-admin';
import * as fs from 'fs';

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function inspectUsers() {
  const users = await db.collection("users").limit(5).get();
  users.forEach(doc => {
    console.log(`User ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
  });
}

inspectUsers().then(() => process.exit(0));
