import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function fixNginx() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado! Relativizando NGINX...');
    
    await ssh.execCommand('sudo systemctl start nginx');
    const status = await ssh.execCommand('sudo systemctl status nginx -l');
    
    console.log('\n--- STATUS DO SERVIDOR ---');
    console.log(status.stdout || status.stderr);
    console.log('----------------------------\n');

  } catch (err: any) {
    console.error('Falha de conexÃ£o:', err.message);
  } finally {
    ssh.dispose();
  }
}

fixNginx();

