import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkNginx() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    const res = await ssh.execCommand('cat /etc/nginx/sites-available/supabase');
    console.log('Nginx Config:');
    console.log(res.stdout);

    const ls = await ssh.execCommand('ls -R /var/www/html/dist/assets');
    console.log('Arquivos em /var/www/html/dist/assets:');
    console.log(ls.stdout);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkNginx();

