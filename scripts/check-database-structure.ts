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

async function checkCollections() {
  const collections = await db.listCollections();
  console.log("Collections found:", collections.map(c => c.id).join(", "));
  
  const memberships = await db.collection("user_memberships").limit(1).get();
  if (memberships.empty) {
    console.log("user_memberships is empty or doesn't exist.");
  } else {
    console.log("user_memberships exists and has data.");
  }
}

checkCollections().then(() => process.exit(0));
