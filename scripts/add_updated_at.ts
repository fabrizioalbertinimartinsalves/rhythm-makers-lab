import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function addUpdatedAt() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado! Adicionando coluna updated_at...');
    
    const sql = "ALTER TABLE public.festival_packages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();";
    const cmd = `docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`;
    const res = await ssh.execCommand(cmd);
    
    console.log(res.stdout || res.stderr);
    console.log('ðŸŽ‰ Coluna updated_at adicionada com sucesso!');

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

addUpdatedAt();

