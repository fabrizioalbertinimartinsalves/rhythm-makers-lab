const admin = require('firebase-admin');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function run() {
  const email = "fabriziofarmaceutico@gmail.com";
  
  const usersSnap = await db.collection("users").where("email", "==", email).get();
  if (usersSnap.empty) {
    console.log("User not found: " + email);
    return;
  }
  
  const userDoc = usersSnap.docs[0];
  const userData = userDoc.data();
  console.log("=== USER DATA ===");
  console.log("UID: " + userDoc.id);
  console.log(JSON.stringify(userData, null, 2));
  
  const membershipsSnap = await db.collection("user_memberships").where("userId", "==", userDoc.id).get();
  console.log("\\n=== MEMBERSHIPS ===");
  console.log("Total memberships: " + membershipsSnap.size);
  
  membershipsSnap.forEach(doc => {
    console.log("Membership ID: " + doc.id);
    console.log(JSON.stringify(doc.data(), null, 2));
    console.log("---");
  });
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
