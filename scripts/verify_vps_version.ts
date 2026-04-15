import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function verifyVpsVersion() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // Search for the version string in the web root
    const res = await ssh.execCommand("grep -r 'v1.8.0-diagnostic' /var/www/rhythm-makers-lab/dist/ || echo 'VersÃ£o nÃ£o encontrada'");
    console.log('Busca por v1.8.0-diagnostic:');
    console.log(res.stdout || res.stderr);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

verifyVpsVersion();

