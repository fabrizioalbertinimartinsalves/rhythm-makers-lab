import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

// Chave Google do usuÃ¡rio (Turn 8 do log original)
const googleJson = `{
  "type": "service_account",
  "project_id": "kineosapp",
  "private_key_id": process.env.GOOGLE_KEY_ID,
  "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDCgEJMDzP41yIy\\nFc/5t7ZrcmDAIJy2KXP3o/fz80viYAvu9XSBbanaKASg/hTI4Vcd4IDG/ji89pZw\\n+brEcmyrXFnQHKdSxrAcK6/vP2mnS65y+wHsBfSuHVn1VmzQ46qjlcwAwHKUq5Bq\\nlpFT3/yJMrfxF2+QMK1jbjd56drjW3QrXcQMuXObcZJURv72f8L55qv+6Mh9HB1/\\nRIkILI1BFcue8mwIj8Leo+AfDIzP53QmwgMqTweDp4Etr1wdf28HvSy/FuRzXUxQ\\n9flN0IjsZVCpINR1rOOfRpEVVcI0n7yOonXI2s+xI69JRmTu5UdZrqOzlQX56wFo\\nh2oCKdftAgMBAAECggEABsx6mh5al+NWlSnxBqQW0s5Wi8YNZEqyUeDf58hEifRc\\nhmz7C758a51EKCfULH9qpFHhfn3gGC7bFwuLrUE+A4bAtvHBduHDbICpxN2nwPV4\\nHW8hDpHYudtZy9B1EPTcVUfaWoO08vXE9beEpfS+5uwob4YnsVfE6nmto8ElFGxh\\ngueWL5xxdbxCRMhpQASGhxvKqIqrVKOP+omjfuK363+Nu0qOE8wD6WqcE/k5ztKJ\\nOGDL2OBSB96FnMn3PEsp5knNGitj3uYlE5sEh2YVpX76hgmXH7LiCpfvF0hyw0yh\\n/S/GXZKuLbeJI+tz3YB/N74G/SLNCkyRlilsltOuQQKBgQDoNGlvN2xSnuIxByTR\\nT7Ut8sJmuCbhjTBBoqlCqRQ8v8IO4vtUrfjoz/TMyKsG4FOR1SPeo4g2tQCVZWx4\\ntLu690m50SAnYclI40wH71kAQqUkxyUkHS/dXlemFHeDKJ+0LHWlaGKQ1S9R40N3\\nRifv2oR1QMk0j+wJuLB9ZKdjIQKBgQDWbr06iAMMqlf9MACrGTrBUlnOX+ueHc55\\YWOs+T+Y/OgYuLrMXiLjW90BWuQ4ZRANRw44moAWpfNcIWkCyCw5QbXNouf253Jh\\nI8lnbF35sF3/QWxe1EThb0slksDGxshnsF7Q7xgv6jKDfdKHCmydhLmRWOmPnplr\\nHgFEm9cnTQKBgQDWkS/oPE+VXQnoghBsdfoWll866enLvFqeG//KAFEZ/ZwFg4r4\\n6bW69AbigH9BYGL4u/pkTbqdys3aPxlnxKJAlyeCVBMhMQP9nUNxhaM5UVwmyvqw\\nD2Rea0IUzo7NHOnOZNLlYLrL2KLcSWPbQHHA+qwxaQdD0cYsCYTUqgDe4QKBgEjh\\nBktYYsDxPEp/ABsmzgNae89aZngs5Tn30aq+Y9EZU8DjOAmxjOX9GNYXEC3im1wH\\n5Ft0l0gbSuTrLgeWBQHIxYOIdJJEA2nkgdU2zZHJUYkpsS1hs69y5fV1NTPZ587l\\n8LPOL0hJrrVmFCF1d4jpzTALKgZ3/uibIA8zcCKZAoGARf08OK5z5d1Hot/vJkvD\\nYIRpEtFy22Ksb3SwqQ2Lha/sQUOySClJ49S3Sr512ebk40G0/1sAGFJV4h/sjhl0\\njLeRlaIq8cKSntN8Ww2UAmj6Wnjt7CpQqPzK1rwq4JppaRaXF73HOGH1Urv6yvDR\\nf02Etvt1vWywva5krPLA0i4=\\n-----END PRIVATE KEY-----\\n",
  "client_email": "backup-bot@kineosapp.iam.gserviceaccount.com",
  "client_id": "113690842572258747526",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/backup-bot%40kineosapp.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}`;

async function executePhase1() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });
    console.log('âœ… Conectado na VPS');

    // 1. Backup do .env
    console.log('ðŸ“¦ Criando backup do arquivo .env...');
    await ssh.execCommand('cp /root/supabase/docker/.env /root/supabase/docker/.env.backup');

    // 2. Gravar google-key.json via Base64
    const keyPath = '/root/supabase/docker/volumes/functions/google-key.json';
    console.log('ðŸ”‘ Gravando google-key.json (via Base64)...');
    const base64Key = Buffer.from(googleJson).toString('base64');
    await ssh.execCommand(`echo "${base64Key}" | base64 -d > ${keyPath}`);
    await ssh.execCommand(`chmod 666 ${keyPath}`);

    // 3. Atualizar .env com as variÃ¡veis (Limpando anteriores)
    console.log('ðŸ“ Sincronizando chaves no arquivo .env...');
    await ssh.execCommand('sed -i "/GOOGLE_SERVICE_ACCOUNT_JSON/d" /root/supabase/docker/.env');
    await ssh.execCommand('sed -i "/DATABASE_URL/d" /root/supabase/docker/.env');
    await ssh.execCommand(`echo "GOOGLE_SERVICE_ACCOUNT_JSON='${googleJson}'" >> /root/supabase/docker/.env`);
    await ssh.execCommand(`echo "DATABASE_URL='postgresql://postgres:postgres@supabase-db:5432/postgres'" >> /root/supabase/docker/.env`);

    // 4. Mapear Volume no docker-compose.yml de forma cirÃºrgica
    console.log('ðŸ“œ Atualizando docker-compose.yml...');
    const res = await ssh.execCommand('cat /root/supabase/docker/docker-compose.yml');
    let compose = res.stdout;
    
    // Garantir montagem de volume
    const mountLine = '      - ./volumes/functions/google-key.json:/etc/google-key.json:ro';
    if (!compose.includes(mountLine)) {
        const functionsStart = compose.indexOf('functions:');
        const volumesStart = compose.indexOf('volumes:', functionsStart);
        const insertPos = compose.indexOf('\n', volumesStart) + 1;
        compose = compose.slice(0, insertPos) + mountLine + '\n' + compose.slice(insertPos);
    }

    // Garantir variÃ¡veis na seÃ§Ã£o functions
    if (!compose.includes('GOOGLE_SERVICE_ACCOUNT_JSON: ${GOOGLE_SERVICE_ACCOUNT_JSON}')) {
        const functionsStart = compose.indexOf('functions:');
        const envStart = compose.indexOf('environment:', functionsStart);
        const insertPos = compose.indexOf('\n', envStart) + 1;
        compose = compose.slice(0, insertPos) + 
                  '      GOOGLE_SERVICE_ACCOUNT_JSON: ${GOOGLE_SERVICE_ACCOUNT_JSON}\n      DATABASE_URL: ${DATABASE_URL}\n' + 
                  compose.slice(insertPos);
    }

    // Salvar docker-compose atualizado (Via arquivo temporÃ¡rio seguro)
    await ssh.execCommand(`echo '${compose.replace(/'/g, "'\\''")}' > /root/supabase/docker/docker-compose.yml.tmp`);
    await ssh.execCommand('mv /root/supabase/docker/docker-compose.yml.tmp /root/supabase/docker/docker-compose.yml');

    // 5. Reiniciar Containers
    console.log('ðŸ”„ Reiniciando containers (Force Recreate)...');
    await ssh.execCommand('cd /root/supabase/docker && docker compose up -d --force-recreate functions db');

    console.log('âœ¨ FASE 1 CONCLUÃDA COM SUCESSO!');

  } catch (err: any) {
    console.error('âŒ ERRO NA FASE 1:', err.message);
  } finally {
    ssh.dispose();
  }
}

executePhase1();

