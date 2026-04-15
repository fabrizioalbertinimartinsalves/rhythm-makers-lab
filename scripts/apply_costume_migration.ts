import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function applyCostumeMigration() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    const sql = `
      ALTER TABLE costume_loans ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'fixed';
      ALTER TABLE costume_loans ADD COLUMN IF NOT EXISTS notes TEXT;
    `;
    const res = await ssh.execCommand(`docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`);
    console.log('Resultado da migration:');
    console.log(res.stdout || res.stderr);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

applyCostumeMigration();

