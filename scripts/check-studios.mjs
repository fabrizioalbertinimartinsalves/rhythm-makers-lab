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

async function checkStudios() {
    try {
        console.log("Buscando todos os documentos na coleção 'studios'...");
        const snap = await db.collection("studios").get();
        console.log(`Total de estúdios encontrados: ${snap.size}`);
        
        snap.forEach(doc => {
            console.log(`- ID: ${doc.id}, Nome: ${doc.data().nome}, Slug: ${doc.data().slug}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkStudios();
