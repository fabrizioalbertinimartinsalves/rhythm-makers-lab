/**
 * Script para configurar CORS no Firebase Storage via Admin SDK
 * Execute: node scripts/setup-storage-cors.js
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const fs = require('fs');

// Encontrar o service account key
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Arquivo service-account.json não encontrado em:', serviceAccountPath);
  console.error('   Baixe em: Firebase Console → Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'atelie-9df54.firebasestorage.app'
});

const storage = getStorage();

// Configuração CORS
const corsConfig = [
  {
    origin: ['*'],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    maxAgeSeconds: 3600,
    responseHeader: [
      'Content-Type',
      'Authorization',
      'Content-Length',
      'User-Agent',
      'x-goog-resumable',
      'x-goog-user-project'
    ]
  }
];

async function setCors() {
  try {
    const bucket = storage.bucket();
    await bucket.setCorsConfiguration(corsConfig);
    console.log('✅ CORS configurado com sucesso no Firebase Storage!');
    console.log('   Bucket:', bucket.name);
  } catch (error) {
    console.error('❌ Erro ao configurar CORS:', error.message);
    process.exit(1);
  }
}

setCors();
