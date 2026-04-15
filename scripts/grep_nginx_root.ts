import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function grepNginxRoot() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // Grep for root in /etc/nginx/sites-available/default
    const res = await ssh.execCommand("grep -r 'root' /etc/nginx/sites-enabled/");
    console.log('Root directives in sites-enabled:');
    console.log(res.stdout || res.stderr);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

grepNginxRoot();

