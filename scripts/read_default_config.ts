import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function readDefaultConfig() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // Read /etc/nginx/sites-available/default
    const res = await ssh.execCommand("cat /etc/nginx/sites-available/default");
    console.log('Default Nginx Config:');
    console.log(res.stdout || res.stderr);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

readDefaultConfig();

