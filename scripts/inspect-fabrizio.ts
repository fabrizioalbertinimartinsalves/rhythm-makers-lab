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
  console.log("Starting...");
  const userAuth = await admin.auth().getUserByEmail(EMAIL);
  console.log("UID:", userAuth.uid);

  const users = await db.collection("users").get();
  console.log("Users in DB:", users.size);
  users.forEach(d => {
    if (d.id === userAuth.uid || d.data().email === EMAIL) {
      console.log("Found User Doc:", d.id, d.data());
    }
  });

  const memberships = await db.collection("user_memberships").get();
  console.log("Memberships in DB:", memberships.size);
  memberships.forEach(d => {
    if (d.data().userId === userAuth.uid || d.data().userId === EMAIL) {
      console.log("Found Membership:", d.data());
    }
  });
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
