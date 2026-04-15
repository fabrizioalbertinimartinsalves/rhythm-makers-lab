import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function grepDefinitiveVersion() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // Grep for 'Build:' in the dist directory
    const res = await ssh.execCommand("grep -r 'Build:' /var/www/html/dist/");
    console.log('OcorrÃªncias de Build string no dist:');
    console.log(res.stdout || res.stderr);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

grepDefinitiveVersion();

