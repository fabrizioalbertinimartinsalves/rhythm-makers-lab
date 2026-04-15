const admin = require('firebase-admin');
const fs = require('fs');

const certPath = './firebase-service-account.json';
if (!fs.existsSync(certPath)) {
    console.error("Erro: arquivo firebase-service-account.json não encontrado.");
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(certPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const email = "fabriziofarmaceutico@gmail.com";

async function promote() {
    try {
        console.log(`Buscando usuário: ${email}...`);
        const user = await admin.auth().getUserByEmail(email);
        console.log(`Usuário encontrado: ${user.uid}. Aplicando papel 'superadmin'...`);

        await admin.firestore().collection("users").doc(user.uid).set({
            email: email,
            role: "superadmin",
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // Adicionar claims para segurança via Auth
        await admin.auth().setCustomUserClaims(user.uid, { superadmin: true });

        console.log("✅ Promoção concluída com sucesso!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Erro durante a promoção:", error);
        process.exit(1);
    }
}

promote();
