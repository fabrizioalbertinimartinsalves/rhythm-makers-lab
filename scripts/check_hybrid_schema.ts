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
    
    // Check columns of classes
    console.log('\n--- classes ---');
    const sql1 = "SELECT column_name FROM information_schema.columns WHERE table_name = 'classes';";
    const res1 = await ssh.execCommand(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql1}"`);
    console.log(res1.stdout);

    // Check columns of classes_avulsas
    console.log('\n--- classes_avulsas ---');
    const sql2 = "SELECT column_name FROM information_schema.columns WHERE table_name = 'classes_avulsas';";
    const res2 = await ssh.execCommand(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql2}"`);
    console.log(res2.stdout);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkColumns();

