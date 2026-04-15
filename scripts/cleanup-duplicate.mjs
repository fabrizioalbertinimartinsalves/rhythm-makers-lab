import admin from 'firebase-admin';
import fs from 'fs';

const certPath = './firebase-service-account.json';
const serviceAccount = JSON.parse(fs.readFileSync(certPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const duplicateDocId = "fabriziofarmaceutico_gmail_com";

async function cleanup() {
    try {
        console.log(`Deletando documento duplicado: ${duplicateDocId}...`);
        await db.collection("users").doc(duplicateDocId).delete();
        console.log("✅ Documento deletado.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

cleanup();
