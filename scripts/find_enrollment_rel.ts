import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function findEnrollmentTables() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // Search for tables matching patterns
    const query = "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%class%' OR tablename LIKE '%enroll%' OR tablename LIKE '%student%');";
    const res = await ssh.execCommand(`docker exec -i supabase-db psql -U postgres -d postgres -c "${query}"`);
    console.log('Tabelas relacionadas:');
    console.log(res.stdout);

    // Check relationship for classes (regular)
    const relQuery = "SELECT tc.table_name, kcu.column_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name='classes';";
    const relRes = await ssh.execCommand(`docker exec -i supabase-db psql -U postgres -d postgres -c "${relQuery}"`);
    console.log('RelaÃ§Ãµes para classes:');
    console.log(relRes.stdout);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

findEnrollmentTables();

