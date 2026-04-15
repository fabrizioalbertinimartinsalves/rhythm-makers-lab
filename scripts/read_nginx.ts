import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function readNginx() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado! Lendo NGINX Configs...');
    
    // Read the "default" block for frontend:
    const defaultConfig = await ssh.execCommand('cat /etc/nginx/sites-available/default');
    console.log('\n--- DEFAULT NGINX (FRONTEND) ---');
    console.log(defaultConfig.stdout);
    console.log('--------------------------------\n');

    // Read the "supabase" block:
    const supabaseConfig = await ssh.execCommand('cat /etc/nginx/sites-available/supabase');
    console.log('\n--- SUPABASE NGINX ---');
    console.log(supabaseConfig.stdout);
    console.log('----------------------\n');

  } catch (err: any) {
    console.error('Falha de conexÃ£o:', err.message);
  } finally {
    ssh.dispose();
  }
}

readNginx();

