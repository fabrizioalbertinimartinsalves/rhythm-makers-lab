import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ============================================================================
// Script para migrar arquivos do Storage do Supabase (Cloud para VPS)
// ============================================================================
// Para rodar este script, você deve ter os pacotes instalados e usar ts-node:
// npx ts-node scripts/migrate_storage.ts
// ============================================================================

// 1. DADOS DA ORIGEM (Seu Supabase Atual na Nuvem)
const SOURCE_URL = 'https://kfajalmdnycdxlhpoqvf.supabase.co'; // Substitua se diferente
const SOURCE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwODEyNywiZXhwIjoyMDg5Nzg0MTI3fQ.YaWqz1NOhclo3URRtn2J-YeaO9RG9oeJDOqK-SyBORg'; // << COLOQUE AQUI

// 2. DADOS DO DESTINO (Sua nova VPS)
const DEST_URL = 'http://95.111.250.154:8000'; // Substitua pela URL da VPS
const DEST_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwODEyNywiZXhwIjoyMDg5Nzg0MTI3fQ.YaWqz1NOhclo3URRtn2J-YeaO9RG9oeJDOqK-SyBORg'; // << COLOQUE AQUI

const sourceClient = createClient(SOURCE_URL, SOURCE_KEY);
const destClient = createClient(DEST_URL, DEST_KEY);

// Pasta temporária local para baixar os arquivos antes de subir
const TEMP_DIR = path.join(process.cwd(), '.temp_migration');

async function migrateStorage() {
  console.log('🚀 Iniciando Migração de Storage...');

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // Listar todos os buckets (pastas raízes) na origem
  const { data: buckets, error: bucketsError } = await sourceClient.storage.listBuckets();
  if (bucketsError) {
    console.error('❌ Erro ao listar buckets da Origem:', bucketsError.message);
    return;
  }

  console.log(`📦 Encontrados ${buckets.length} buckets.`);

  for (const bucket of buckets) {
    console.log(`\n📂 Processando bucket: ${bucket.name}`);

    // Criar o bucket no destino se não existir
    const { error: createError } = await destClient.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit,
      allowedMimeTypes: bucket.allowed_mime_types,
    });
    
    if (createError && !createError.message.includes('already exists')) {
       console.log(`Aviso ao criar bucket ${bucket.name} no destino:`, createError.message);
    } else {
       console.log(`✅ Bucket ${bucket.name} pronto no destino.`);
    }

    // Listar arquivos e pastas dentro do bucket (função recursiva simulada via prefixo)
    await processBucketFiles(bucket.name, '');
  }

  console.log('\n🎉 Migração de Storage Concluída!');
}

async function processBucketFiles(bucketName: string, pathPrefix: string) {
  const { data: list, error } = await sourceClient.storage.from(bucketName).list(pathPrefix, {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.error(`❌ Erro ao listar arquivos na pasta ${pathPrefix}:`, error.message);
    return;
  }

  if (!list || list.length === 0) return;

  for (const item of list) {
    const itemPath = pathPrefix ? `${pathPrefix}/${item.name}` : item.name;

    // Se for um diretório (.emptyFolderPlaceholder ou similar não é garantido, então checamos atributos)
    if (!item.id && !item.updated_at) { 
      // É uma sub-pasta, faremos busca nela
      await processBucketFiles(bucketName, itemPath);
      continue;
    }

    // Ignorar arquivos corrompidos ou placeholders internos (se houver)
    if (item.name === '.emptyFolderPlaceholder') continue;

    console.log(`  Downloading: ${itemPath}...`);
    
    // Baixar o arquivo da origem
    const { data: fileData, error: downloadError } = await sourceClient.storage.from(bucketName).download(itemPath);
    if (downloadError) {
      console.error(`  ❌ Falha no download de ${itemPath}:`, downloadError.message);
      continue;
    }

    // Converter para buffer/array para upload
    const fileBuffer = await fileData.arrayBuffer();

    console.log(`  Uploading: ${itemPath}...`);
    
    // Subir o arquivo para o destino
    const { error: uploadError } = await destClient.storage.from(bucketName).upload(itemPath, fileBuffer, {
      upsert: true,
      contentType: item.metadata?.mimetype || 'application/octet-stream',
      cacheControl: item.metadata?.cacheControl || '3600'
    });

    if (uploadError) {
       console.error(`  ❌ Falha no upload de ${itemPath}:`, uploadError.message);
    } else {
       console.log(`  ✅ Concluído: ${itemPath}`);
    }
  }
}

migrateStorage().catch(console.error);
