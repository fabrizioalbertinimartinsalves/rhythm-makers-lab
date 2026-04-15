/**
 * SCRIPT: Migração de Firebase Storage -> Supabase VPS
 * 
 * Este script faz o download de todos os arquivos espalhados pelo seu Firebase Storage
 * e faz o upload centralizado no bucket "uploads" do seu Supabase na VPS.
 * 
 * PRÉ-REQUISITOS ANTES DE RODAR:
 * 1. npm install firebase-admin
 * 2. Crie um arquivo serviceAccountKey.json obtido no painel do Firebase:
 *    Configurações do Projeto > Contas de Serviço > Gerar nova chave privada.
 * 3. Coloque o arquivo serviceAccountKey.json na raiz do projeto (mesma pasta do package.json).
 * 
 * COMO RODAR:
 * npx tsx scripts/migrate_firebase_to_supabase.ts
 */

import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ===========================================
// CONFIGURAÇÕES
// ===========================================
const FIREBASE_BUCKET_NAME = 'atelie-9df54.firebasestorage.app'; // Bucket do Firebase

// SUAS CHAVES DA VPS DO SUPABASE
const VPS_URL = 'http://95.111.250.154:8000'; 
const VPS_SERVICE_ROLE = 'SUA_CHAVE_SERVICE_ROLE_AQUI'; // <- Substituir!

const SUPABASE_BUCKET = 'uploads'; // O bucket que unificamos no upload.ts

// ===========================================

// 1. Inicia Firebase Admin
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ ARQUIVO NÃO ENCONTRADO: serviceAccountKey.json');
  console.error('Baixe-o no Painel do Firebase em Configurações do Projeto > Contas de Serviço.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: FIREBASE_BUCKET_NAME
});

const bucket = admin.storage().bucket();
const supabase = createClient(VPS_URL, VPS_SERVICE_ROLE);

async function migrateFirebaseToSupabase() {
  console.log('🚀 Iniciando Migração Firebase -> Supabase VPS');

  // Garante que o bucket destino existe no Supabase da VPS
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === SUPABASE_BUCKET)) {
    console.log(`Criando bucket público '${SUPABASE_BUCKET}' no Supabase...`);
    await supabase.storage.createBucket(SUPABASE_BUCKET, { public: true });
  }

  console.log('Listando arquivos do Firebase Storage...');
  
  // Lista TODOS os arquivos do Bucket
  const [files] = await bucket.getFiles();
  console.log(`Encontrados ${files.length} arquivos no Firebase.`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    // Ignorar pastas puras do Firebase
    if (file.name.endsWith('/')) continue;

    console.log(`\n> Migrando: ${file.name}`);
    
    try {
      // 1. Download do Firebase (direto na memória)
      const [buffer] = await file.download();

      // Pega metadata para manter o Content Type
      const [metadata] = await file.getMetadata();
      const contentType = metadata.contentType || 'application/octet-stream';

      // 2. Upload para o Supabase
      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(file.name, buffer, {
          contentType: contentType,
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error(`  ❌ Falha no envio para Supabase:`, uploadError.message);
        errorCount++;
      } else {
        console.log(`  ✅ Transferido.`);
        successCount++;
      }
    } catch (err: any) {
      console.error(`  ❌ Falha ao baixar do Firebase:`, err.message);
      errorCount++;
    }
  }

  console.log('\n=============================================');
  console.log('🎉 MIGRAÇÃO CONCLUÍDA');
  console.log(`✅ Sucesso: ${successCount}`);
  console.log(`❌ Falhas: ${errorCount}`);
  console.log('=============================================');
}

migrateFirebaseToSupabase().catch(console.error);
