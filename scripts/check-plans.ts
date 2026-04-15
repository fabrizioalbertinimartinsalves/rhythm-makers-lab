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

async function checkPlans() {
  try {
    const snap = await db.collection("saas_plans").get();
    console.log(`Found ${snap.size} plans.`);
    snap.forEach(doc => {
      console.log(`Plan ID: ${doc.id}`, doc.data());
    });
  } catch (e) {
    console.error("Error accessing saas_plans:", e);
  }
  process.exit(0);
}

checkPlans();
