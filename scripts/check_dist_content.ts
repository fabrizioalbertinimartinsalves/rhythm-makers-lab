import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkDistContent() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    const res = await ssh.execCommand("ls -la /var/www/html/dist/");
    console.log('ConteÃºdo de /var/www/html/dist/:');
    console.log(res.stdout || res.stderr);

    // Read the index.html to see where it's pointing
    const res2 = await ssh.execCommand("cat /var/www/html/dist/index.html | head -n 20");
    console.log('InÃ­cio do index.html:');
    console.log(res2.stdout || res2.stderr);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkDistContent();

