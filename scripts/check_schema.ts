import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkColumns() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado! Verificando colunas...');
    
    // Check columns of festival_packages
    const sql = "SELECT column_name FROM information_schema.columns WHERE table_name = 'festival_packages';";
    const cmd = `docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`;
    const res = await ssh.execCommand(cmd);
    
    console.log(res.stdout);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkColumns();

