import * as admin from "firebase-admin";
import * as fs from "fs";

const SERVICE_ACCOUNT = "./firebase-service-account.json";

if (!fs.existsSync(SERVICE_ACCOUNT)) {
  console.error("Erro: arquivo 'firebase-service-account.json' não encontrado.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function promoteUser(email: string) {
  try {
    console.log(`Buscando usuário: ${email}...`);
    const user = await admin.auth().getUserByEmail(email);
    
    if (!user) {
        console.error("Usuário não encontrado no Auth.");
        return;
    }

    console.log(`Usuário encontrado: ${user.uid}. Promovendo...`);

    // 1. Atualizar no Firestore
    await admin.firestore().collection("users").doc(user.uid).set({
      email: email,
      role: "superadmin",
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Adicionar claim customizada para segurança extra
    await admin.auth().setCustomUserClaims(user.uid, { superadmin: true });

    console.log(`✅ Usuário ${email} promovido a SuperAdmin com sucesso no Firestore e Auth Claims!`);
  } catch (error) {
    console.error("❌ Erro ao promover usuário:", error);
  }
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log("Uso: npx ts-node scripts/promote-user.ts <email>");
} else {
  promoteUser(args[0]).then(() => {
      console.log("Script finalizado.");
      process.exit(0);
  });
}
