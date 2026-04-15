import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkData() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // Fetch data from classes_avulsas
    const sql = "SELECT id, nome, data, horario, horario_fim FROM classes_avulsas LIMIT 5;";
    const cmd = `docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`;
    const res = await ssh.execCommand(cmd);
    
    console.log('Resultados do Banco:');
    console.log(res.stdout);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkData();

