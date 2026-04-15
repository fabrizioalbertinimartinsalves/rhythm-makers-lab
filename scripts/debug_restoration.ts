import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function debug() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('--- ÃšLTIMA MENSAGEM DE ERRO DO BANCO ---');
    const dbRes = await ssh.execCommand('docker exec -i supabase-db psql -U postgres -d postgres -t -c "SELECT error_message FROM system_checkpoints ORDER BY created_at DESC LIMIT 1;"');
    console.log(dbRes.stdout || dbRes.stderr);

    console.log('\n--- LOGS RECENTES DA EDGE FUNCTION ---');
    const logRes = await ssh.execCommand('docker logs --tail 30 supabase-edge-functions');
    console.log(logRes.stdout || logRes.stderr);

  } catch (err: any) {
    console.error('Erro de conexÃ£o:', err.message);
  } finally {
    ssh.dispose();
  }
}

debug();

