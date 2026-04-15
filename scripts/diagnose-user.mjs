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
const email = "fabriziofarmaceutico@gmail.com";

async function diagnose() {
    try {
        console.log(`--- DIAGNÓSTICO PARA: ${email} ---`);
        
        // 1. Auth check
        const userAuth = await admin.auth().getUserByEmail(email);
        console.log(`Auth UID: ${userAuth.uid}`);

        // 2. Check document by UID (How useAuth.tsx does it)
        const docByUid = await db.collection("users").doc(userAuth.uid).get();
        if (docByUid.exists) {
            console.log(`✅ Documento encontrado por UID (${userAuth.uid})`);
            console.log(`Dados: ${JSON.stringify(docByUid.data(), null, 2)}`);
        } else {
            console.log(`❌ Documento NÃO encontrado por UID (${userAuth.uid})`);
        }

        // 3. Search by email field (Backup search)
        const snapByEmail = await db.collection("users").where("email", "==", email).get();
        if (!snapByEmail.empty) {
            console.log(`✅ Encontrado(s) ${snapByEmail.size} documento(s) com o campo email: ${email}`);
            snapByEmail.forEach(d => {
                console.log(`ID do Documento: ${d.id}`);
                console.log(`Dados: ${JSON.stringify(d.data(), null, 2)}`);
            });
        } else {
            console.log(`❌ Nenhum documento encontrado com o campo email: ${email}`);
        }

        // 4. Check memberships
        const memberships = await db.collection("user_memberships").where("userId", "==", userAuth.uid).get();
        console.log(`Vínculos por UID (${userAuth.uid}): ${memberships.size}`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

diagnose();
