import admin from 'firebase-admin';
import * as fs from 'fs';

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function dumpCollection(name: string) {
  console.log(`\n>>> COLLECTION: ${name} <<<`);
  const snap = await db.collection(name).get();
  console.log(`Count: ${snap.size}`);
  for (const doc of snap.docs) {
    console.log(`  DOC_ID: ${doc.id}`);
    console.log(`  DATA:   ${JSON.stringify(doc.data())}`);
  }
}

async function run() {
  await dumpCollection('users');
  await dumpCollection('user_memberships');
  await dumpCollection('user_roles');
  await dumpCollection('organization_members');
  await dumpCollection('studios');
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
