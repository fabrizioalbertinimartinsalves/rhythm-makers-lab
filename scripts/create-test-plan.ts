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

async function createTestPlan() {
  try {
    const plan = {
      nome: "Plano Teste",
      descricao: "Descrição do plano teste",
      valor_mensal: 99,
      limite_alunos: 50,
      limite_instrutores: 5,
      limite_turmas: 10,
      modulos: ["agenda", "alunos"],
      ativo: true,
      createdAt: new Date().toISOString()
    };
    const res = await db.collection("saas_plans").add(plan);
    console.log(`✅ Test plan created with ID: ${res.id}`);
  } catch (e) {
    console.error("❌ Error creating test plan:", e);
  }
  process.exit(0);
}

createTestPlan();
