import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function superDebug() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });
    console.log('âœ… Conectado na VPS\n');

    console.log('--- [1] VERIFICANDO .ENV (Ãšltimas 10 linhas) ---');
    const envRes = await ssh.execCommand('tail -n 10 /root/supabase/docker/.env');
    console.log(envRes.stdout);

    console.log('\n--- [2] VERIFICANDO DOCKER-COMPOSE (SeÃ§Ã£o Functions) ---');
    const compRes = await ssh.execCommand('grep -A 15 "functions:" /root/supabase/docker/docker-compose.yml');
    console.log(compRes.stdout);

    console.log('\n--- [3] INSPECCIONANDO CONTAINER (VariÃ¡veis Ativas) ---');
    const inspRes = await ssh.execCommand('docker inspect supabase-edge-functions --format "{{range .Config.Env}}{{println .}}{{end}}"');
    const envVars = inspRes.stdout.split('\n');
    console.log('GOOGLE_SERVICE_ACCOUNT_JSON presente?', envVars.some(v => v.startsWith('GOOGLE_SERVICE_ACCOUNT_JSON=')));
    console.log('DATABASE_URL presente?', envVars.some(v => v.startsWith('DATABASE_URL=')));

    console.log('\n--- [4] ÃšLTIMO ERRO NO BANCO ---');
    const dbRes = await ssh.execCommand('docker exec -i supabase-db psql -U postgres -d postgres -t -c "SELECT error_message FROM system_checkpoints ORDER BY created_at DESC LIMIT 1;"');
    console.log('Erro DB:', dbRes.stdout.trim());

  } catch (err: any) {
    console.error('Erro de diagnÃ³stico:', err.message);
  } finally {
    ssh.dispose();
  }
}

superDebug();

