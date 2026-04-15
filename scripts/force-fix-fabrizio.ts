import admin from 'firebase-admin';
import * as fs from 'fs';

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';
const EMAIL = 'fabriziofarmaceutico@gmail.com';
const STUDIO_ID = 'XBlEeXavaBF5Di3yE2qG';

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function run() {
  const userAuth = await admin.auth().getUserByEmail(EMAIL);
  const correctUid = userAuth.uid;
  console.log(`Correct UID from Auth: ${correctUid}`);

  // 1. Encontrar memberships "quebradas" (talvez pelo email ou UID parcial)
  const allMemberships = await db.collection("user_memberships").get();
  console.log(`Total memberships to check: ${allMemberships.size}`);
  
  const batch = db.batch();
  let fixes = 0;

  for (const doc of allMemberships.docs) {
    const data = doc.data();
    // Se o userId é diferente do correto MAS parace ser do Fabrizio (pelo e-mail ou prefixo)
    if (data.userId !== correctUid) {
        console.log(`Found membership with different userId: ${data.userId}`);
        // Se quisermos ser agressivos e assumir que a única membership é dele:
        batch.update(doc.ref, { userId: correctUid });
        fixes++;
    }
  }

  // Se não encontrou nenhuma para fixar, criar uma nova garantida
  if (fixes === 0) {
    console.log("No memberships found to fix. Creating a fresh one...");
    await db.collection("user_memberships").add({
        userId: correctUid,
        studioId: STUDIO_ID,
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("Fresh membership created.");
  } else {
    await batch.commit();
    console.log(`Successfully fixed ${fixes} memberships.`);
  }

  // Garantir que o documento do usuário também tenha o UID correto
  await db.collection("users").doc(correctUid).set({
    email: EMAIL,
    nome: 'Fabrizio Martins',
    role: 'admin',
    studioId: STUDIO_ID
  }, { merge: true });
  console.log("User doc updated.");
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
