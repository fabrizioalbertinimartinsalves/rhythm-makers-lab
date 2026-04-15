import * as admin from "firebase-admin";
import * as fs from "fs";

// Para usar este script, você deve baixar o arquivo JSON de conta de serviço do Firebase 
// e salvá-lo como 'service-account.json' na raiz do projeto.

if (!fs.existsSync("./service-account.json")) {
  console.error("Erro: arquivo 'service-account.json' não encontrado.");
  console.log("Baixe-o no console do Firebase -> Configurações do Projeto -> Contas de Serviço.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync("./service-account.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function changeUserPassword(email: string, newPassword: string) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, {
      password: newPassword
    });
    console.log(`✅ Senha do usuário ${email} alterada com sucesso!`);
  } catch (error) {
    console.error("❌ Erro ao trocar senha:", error);
  }
}

// Uso: npx ts-node scripts/reset-password.ts <email> <nova_senha>
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Uso: npx ts-node scripts/reset-password.ts <email> <nova_senha>");
} else {
  changeUserPassword(args[0], args[1]);
}
