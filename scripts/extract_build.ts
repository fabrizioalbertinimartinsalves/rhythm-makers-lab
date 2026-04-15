import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function extractBuildVersion() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // Find version in assets
    const res = await ssh.execCommand("grep -r 'Build: v' /var/www/html/dist/assets/ | head -n 1");
    console.log('Resultado do grep:');
    console.log(res.stdout || res.stderr);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

extractBuildVersion();

