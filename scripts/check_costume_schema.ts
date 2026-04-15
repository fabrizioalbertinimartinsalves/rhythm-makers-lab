import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkCostumeSchema() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // Check columns of costumes
    const costumesCols = await ssh.execCommand("docker exec -i supabase-db psql -U postgres -d postgres -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'costumes';\"");
    console.log('Colunas de costumes:');
    console.log(costumesCols.stdout);

    // Check columns of costume_loans
    const loansCols = await ssh.execCommand("docker exec -i supabase-db psql -U postgres -d postgres -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'costume_loans';\"");
    console.log('Colunas de costume_loans:');
    console.log(loansCols.stdout);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkCostumeSchema();

