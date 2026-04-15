import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkRelationships() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // Check tables
    const tables = await ssh.execCommand("docker exec -i supabase-db psql -U postgres -d postgres -c \"SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';\"");
    console.log('Tabelas no banco:');
    console.log(tables.stdout);

    // Check data in classes_avulsas with studio_id
    const data = await ssh.execCommand("docker exec -i supabase-db psql -U postgres -d postgres -c \"SELECT id, studio_id, nome FROM classes_avulsas;\"");
    console.log('Dados em classes_avulsas:');
    console.log(data.stdout);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkRelationships();

