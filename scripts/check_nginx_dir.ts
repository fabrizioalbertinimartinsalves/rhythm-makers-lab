import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkNginxSuggestedDir() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    const res = await ssh.execCommand("ls -la /var/www/rhythm-makers-lab/dist/");
    console.log('ConteÃºdo de /var/www/rhythm-makers-lab/dist/:');
    console.log(res.stdout || res.stderr);

    // Read index.html of this dir
    const res2 = await ssh.execCommand("cat /var/www/rhythm-makers-lab/dist/index.html | head -n 20");
    console.log('index.html de /var/www/rhythm-makers-lab/dist/:');
    console.log(res2.stdout || res2.stderr);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkNginxSuggestedDir();

