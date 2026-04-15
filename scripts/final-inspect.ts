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
  const correctUid = userAuth.uid;
  console.log(`Auth UID: [${correctUid}] (Length: ${correctUid.length})`);

  const memberships = await db.collection("user_memberships").get();
  console.log(`Total Memberships: ${memberships.size}`);
  
  memberships.forEach(doc => {
    const data = doc.data();
    const userIdInDoc = data.userId;
    console.log(`- Doc ID: ${doc.id}`);
    console.log(`   userId in Doc: [${userIdInDoc}] (Length: ${userIdInDoc ? userIdInDoc.length : 'N/A'})`);
    console.log(`   All Fields: ${Object.keys(data).join(", ")}`);
    
    if (userIdInDoc === correctUid) {
      console.log("  >>> MATCH FOUND! (Binary same)");
    } else {
      console.log("  >>> NO MATCH.");
    }
  });

  // Verificar se o documento do usuário está correto também
  const userDoc = await db.collection("users").doc(correctUid).get();
  if (userDoc.exists()) {
    console.log(`User Doc exists with correct ID. Fields: ${Object.keys(userDoc.data() || {}).join(", ")}`);
  } else {
    console.log(`User Doc MISSING for ID: ${correctUid}`);
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
