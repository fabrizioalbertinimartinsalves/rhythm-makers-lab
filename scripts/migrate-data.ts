import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

// 1. Configurações (Preencha com suas chaves se não disparar automático)
const SUPABASE_URL = "https://pksnlphjigeochghdteq.supabase.co";
const SUPABASE_SERVICE_KEY = "SUA_SERVICE_ROLE_KEY_AQUI"; // Precisa da SERVICE_ROLE para ler tudo

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error("❌ Erro: Arquivo 'firebase-service-account.json' não encontrado na raiz!");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrate() {
  console.log("🚀 Iniciando migração de dados...");

  try {
    // --- 1. MIGRAR STUDIOS ---
    console.log("📁 Migrando Estúdios...");
    const { data: studios, error: sErr } = await supabase.from('studios').select('*');
    if (sErr) throw sErr;

    for (const s of studios || []) {
       await db.collection('studios').doc(s.id).set({
         name: s.name,
         created_at: s.created_at || new Date().toISOString(),
         updated_at: new Date().toISOString()
       }, { merge: true });
    }
    console.log(`✅ ${studios?.length} Estúdios migrados.`);

    // --- 2. MIGRAR USERS (PROFILES) ---
    console.log("👤 Migrando Usuários...");
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
    if (pErr) throw pErr;

    for (const p of profiles || []) {
       await db.collection('users').doc(p.id).set({
         full_name: p.full_name,
         role: p.role || 'student',
         studioId: p.studio_id,
         created_at: p.created_at || new Date().toISOString()
       }, { merge: true });
    }
    console.log(`✅ ${profiles?.length} Usuários migrados.`);

    // --- 3. MIGRAR ALUNOS (DENTRO DE ESTÚDIOS) ---
    console.log("🎓 Migrando Alunos...");
    const { data: alunos, error: aErr } = await supabase.from('alunos').select('*');
    if (aErr) throw aErr;

    for (const a of alunos || []) {
       if (!a.studio_id) continue;
       await db.collection('studios').doc(a.studio_id).collection('alunos').doc(a.id).set({
         nome: a.nome,
         email: a.email,
         telefone: a.telefone,
         cpf: a.cpf,
         user_uid: a.user_id,
         created_at: a.created_at || new Date().toISOString()
       }, { merge: true });
    }
    console.log(`✅ ${alunos?.length} Alunos migrados.`);

    // --- 4. MIGRAR MODALITIES ---
    console.log("🎨 Migrando Modalidades...");
    const { data: modalities, error: mErr } = await supabase.from('modalities').select('*');
    if (mErr) throw mErr;

    for (const mod of modalities || []) {
       if (!mod.studio_id) continue;
       await db.collection('studios').doc(mod.studio_id).collection('modalities').doc(mod.id).set({
         nome: mod.nome,
         descricao: mod.descricao,
         cor: mod.color,
         created_at: mod.created_at || new Date().toISOString()
       }, { merge: true });
    }
    console.log(`✅ ${modalities?.length} Modalidades migradas.`);

    // --- 5. MIGRAR PLANS ---
    console.log("💰 Migrando Planos...");
    const { data: plans, error: plErr } = await supabase.from('plans').select('*');
    if (plErr) throw plErr;

    for (const pl of plans || []) {
       if (!pl.studio_id) continue;
       await db.collection('studios').doc(pl.studio_id).collection('plans').doc(pl.id).set({
         nome: pl.nome,
         descricao: pl.descricao,
         valor: pl.valor,
         frequencia_semanal: pl.frequencia_semanal,
         created_at: pl.created_at || new Date().toISOString()
       }, { merge: true });
    }
    console.log(`✅ ${plans?.length} Planos migrados.`);

    // --- 6. MIGRAR TURMAS (CLASSES) ---
    console.log("🏫 Migrando Turmas...");
    const { data: classes, error: cErr } = await supabase.from('classes').select('*');
    if (cErr) throw cErr;

    for (const c of classes || []) {
       if (!c.studio_id) continue;
       await db.collection('studios').doc(c.studio_id).collection('classes').doc(c.id).set({
         name: c.name,
         description: c.description,
         modality_id: c.modality_id,
         created_at: c.created_at || new Date().toISOString()
       }, { merge: true });
    }
    console.log(`✅ ${classes?.length} Turmas migradas.`);

    console.log("\n🎉 Migração Concluída com Sucesso!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Erro durante a migração:", err);
    process.exit(1);
  }
}

migrate();
