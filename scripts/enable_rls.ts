import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function enableRLS() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado! Habilitando RLS nas Tabelas...');
    
    const sql = `
      ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
    `;

    // Send SQL to the postgres container
    const cmd = `docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`;
    const res = await ssh.execCommand(cmd);
    
    console.log(res.stdout || res.stderr);
    console.log('ðŸŽ‰ RLS (SeguranÃ§a MÃ¡gica de Linhas) ativada com sucesso!');

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

enableRLS();

