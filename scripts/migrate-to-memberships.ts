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

async function migrate() {
  console.log("Starting migration to user_memberships...");
  const usersSnap = await db.collection("users").get();
  
  if (usersSnap.empty) {
    console.log("No users found to migrate.");
    return;
  }

  const batch = db.batch();
  let count = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const userId = userDoc.id;

    // Se o usuário tem studioId e role, criar o vínculo
    if (data.studioId) {
      const membershipRef = db.collection("user_memberships").doc();
      batch.set(membershipRef, {
        userId: userId,
        studioId: data.studioId,
        role: data.role || (data.roles && data.roles[0]) || 'student',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      count++;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully migrated ${count} memberships.`);
  } else {
    console.log("No memberships to migrate.");
  }
}

migrate().then(() => {
  console.log("Migration finished.");
  process.exit(0);
}).catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
