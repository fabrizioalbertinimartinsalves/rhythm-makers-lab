import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function auditVps() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });
    console.log('âœ… Conectado na VPS para Auditoria\n');

    // 1. Verificar Edge Functions section
    console.log('--- [DOCKER-COMPOSE: functions] ---');
    const r1 = await ssh.execCommand('grep -A 35 "functions:" /root/supabase/docker/docker-compose.yml');
    console.log(r1.stdout || 'SeÃ§Ã£o nÃ£o encontrada!');

    // 2. Verificar o .env
    console.log('\n--- [.ENV: Segredos] ---');
    const r2 = await ssh.execCommand('grep -E "GOOGLE_SERVICE_ACCOUNT_JSON|DATABASE_URL" /root/supabase/docker/.env');
    console.log(r2.stdout || 'Segredos nÃ£o encontrados no .env!');

    // 3. Verificar o arquivo fÃ­sico
    console.log('\n--- [ARQUIVO FÃSICO: google-key.json] ---');
    const r3 = await ssh.execCommand('ls -lh /etc/google-key.json /root/supabase/docker/volumes/functions/google-key.json /root/supabase/docker/volumes/functions/cloud-checkpoint/google-key.json');
    console.log(r3.stdout || r3.stderr);

  } catch (err: any) {
    console.error('Erro na auditoria:', err.message);
  } finally {
    ssh.dispose();
  }
}

auditVps();

