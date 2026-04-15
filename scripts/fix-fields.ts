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

async function fixFields() {
  const orgsSnap = await db.collection("studios").get();
  for (const org of orgsSnap.docs) {
    const data = org.data();
    const updates: any = {};
    
    if (data.name && !data.nome) updates.nome = data.name;
    if (data.email && !data.email_contato) updates.email_contato = data.email;
    if (data.phone && !data.telefone) updates.telefone = data.phone;
    
    // Cleanup old fields if we are migrating them
    if (Object.keys(updates).length > 0) {
      // Optional: updates.name = admin.firestore.FieldValue.delete();
      await org.ref.update(updates);
      console.log(`✅ Fixed fields for studio: ${org.id}`);
    }
  }
  console.log("All done.");
  process.exit(0);
}

fixFields();
