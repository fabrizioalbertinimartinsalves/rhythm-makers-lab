import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function listNginxSites() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    const res = await ssh.execCommand("ls -la /etc/nginx/sites-enabled/");
    console.log('Sites Enabled:');
    console.log(res.stdout || res.stderr);

    const res2 = await ssh.execCommand("ls -la /var/www/html/");
    console.log('Pasta /var/www/html/:');
    console.log(res2.stdout || res2.stderr);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

listNginxSites();

