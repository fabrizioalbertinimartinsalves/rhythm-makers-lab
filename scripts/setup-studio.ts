import admin from 'firebase-admin';
import * as fs from 'fs';

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error("❌ Erro: Arquivo 'firebase-service-account.json' não encontrado na raiz!");
  console.error("Por favor, baixe do site do Firebase e coloque com este nome na pasta do projeto.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

// Inicializa o app
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

const SUPER_ADMIN_EMAIL = "fabriziofarmaceutico@gmail.com";

const STUDIO_DATA = {
  name: "Ateliê do Corpo Dani Lage",
  slug: "atelie-dani",
  email: "atelidocorpodanilage@gmail.com",
  phone: "(31)993537587",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

async function setup() {
  console.log("🚀 Iniciando configuração do Super Admin e do Estúdio...");

  try {
    // 1. Achar o Usuário Super Admin no Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(SUPER_ADMIN_EMAIL);
      console.log(`✅ Usuário ${SUPER_ADMIN_EMAIL} encontrado no Auth (UID: ${userRecord.uid}).`);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        console.error(`❌ Erro: O usuário com e-mail ${SUPER_ADMIN_EMAIL} ainda não se cadastrou no sistema.`);
        console.error(`Crie a conta primeiro pela tela de Login usando esse e-mail.`);
        process.exit(1);
      } else {
        throw e;
      }
    }

    const uid = userRecord.uid;

    // 2. Definir o Role no Firestore
    const userRef = db.collection("users").doc(uid);
    await userRef.set({
      email: SUPER_ADMIN_EMAIL,
      role: "superadmin",
      roles: ["superadmin", "admin", "instructor", "student"], // Garante todos os papéis
      updated_at: new Date().toISOString()
    }, { merge: true });
    
    // Atualizar Custom Claims no Auth (opcional, mas recomendado)
    await auth.setCustomUserClaims(uid, { role: 'superadmin' });
    console.log(`✅ Permissão de Super Admin concedida no Firestore e no Auth.`);

    // 3. Criar o Estúdio
    const studioQuery = await db.collection("studios").where("slug", "==", "atelie-dani").get();
    
    let studioId;
    if (studioQuery.empty) {
      console.log("🏢 Criando nova organização: Ateliê do Corpo Dani Lage...");
      const newStudioRef = await db.collection("studios").add(STUDIO_DATA);
      studioId = newStudioRef.id;
      console.log(`✅ Organização criada com ID: ${studioId}`);
    } else {
      studioId = studioQuery.docs[0].id;
      console.log(`⚠️ A organização já existia (ID: ${studioId}). Atualizando dados...`);
      await db.collection("studios").doc(studioId).set(STUDIO_DATA, { merge: true });
    }

    // 4. Vincular o Super Admin ao Estúdio (para que ele consiga ver o estúdio como admin também)
    await userRef.set({
      studioId: studioId
    }, { merge: true });
    console.log(`✅ Super Admin vinculado à nova organização.`);

    console.log("\n🎉 Tudo pronto! Atualize a página e você poderá fazer o login!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Erro durante a configuração:", err);
    process.exit(1);
  }
}

setup();
