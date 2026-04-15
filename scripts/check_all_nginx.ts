import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkAllNginx() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // List all enabled sites
    const sites = await ssh.execCommand('ls /etc/nginx/sites-enabled');
    console.log('Sites habilitados:', sites.stdout);

    // Read default if it exists
    const def = await ssh.execCommand('cat /etc/nginx/sites-available/default');
    console.log('Default Config:', def.stdout);

    // Read any other config
    const kineos = await ssh.execCommand('cat /etc/nginx/sites-available/kineos');
    console.log('Kineos Config:', kineos.stdout);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkAllNginx();

