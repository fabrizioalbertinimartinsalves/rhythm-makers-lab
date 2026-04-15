import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function findBookings() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // Search for any foreign key pointing to classes_avulsas
    const query = `
      SELECT
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name='classes_avulsas';
    `;
    const res = await ssh.execCommand(`docker exec -i supabase-db psql -U postgres -d postgres -c "${query}"`);
    console.log('RelaÃ§Ãµes encontradas para classes_avulsas:');
    console.log(res.stdout);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

findBookings();

