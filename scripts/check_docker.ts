import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkDocker() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado! Verificando Docker / Supabase...');
    
    // Check if docker containers are running
    const dockerPs = await ssh.execCommand('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"');
    console.log('\n--- DOCKER CONTAINERS ---');
    console.log(dockerPs.stdout);
    if (!dockerPs.stdout) console.log("NENHUM DOCKER RODANDO!");
    console.log('-------------------------\n');

    // Also check if we have the nginx reverse proxy for the API
    const nginxSites = await ssh.execCommand('ls -l /etc/nginx/sites-enabled/');
    console.log('\n--- NGINX SITES ---');
    console.log(nginxSites.stdout);
    console.log('-------------------------\n');

  } catch (err: any) {
    console.error('Falha de conexÃ£o:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkDocker();

