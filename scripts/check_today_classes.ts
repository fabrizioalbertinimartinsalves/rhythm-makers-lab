import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkOccurrences() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`Verificando ocorrÃªncias para: ${today}`);

    const sql = `SELECT id, occurrence_date, start_time, scheduled_instructor_id, status FROM class_occurrences WHERE occurrence_date = '${today}';`;
    const res = await ssh.execCommand(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`);
    console.log('OcorrÃªncias de Hoje:');
    console.log(res.stdout);

    const instructors = await ssh.execCommand(`docker exec -i supabase-db psql -U postgres -d postgres -c "SELECT id, email FROM auth.users WHERE id IN (SELECT scheduled_instructor_id FROM class_occurrences WHERE occurrence_date = '${today}');"`);
    console.log('Instrutores Agendados Hoje:');
    console.log(instructors.stdout);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkOccurrences();

