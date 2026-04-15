const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });
    
    console.log('--- LENDO BACKUP DO NGINX ---');
    const res = await ssh.execCommand('cat /etc/nginx/sites-available/default.bak');
    console.log(res.stdout);
    
    console.log('\n--- VERIFICANDO CERTIFICADOS DISPONIVEIS NO LETSENCRYPT ---');
    const certs = await ssh.execCommand('ls -R /etc/letsencrypt/live/');
    console.log(certs.stdout);

    ssh.dispose();
  } catch (err) {
    console.error('Erro SSH:', err.message);
  }
}

run();

