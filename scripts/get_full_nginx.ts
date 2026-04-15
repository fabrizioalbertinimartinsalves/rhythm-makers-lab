import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function getFullNginxConfig() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // Get full nginx config with nginx -T
    const res = await ssh.execCommand("nginx -T");
    console.log('Nginx -T Output:');
    console.log(res.stdout || res.stderr);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

getFullNginxConfig();

