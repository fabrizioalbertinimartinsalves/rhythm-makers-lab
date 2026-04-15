import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function diagnose() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… Conectado na VPS. Verificando o NGINX...');
    
    const result = await ssh.execCommand('nginx -t');
    console.log('\n--- SAÃDA DO TESTE NGINX ---');
    console.log(result.stdout);
    console.log(result.stderr);
    console.log('----------------------------\n');

  } catch (err: any) {
    console.error('Falha ao conectar via SSH:', err.message);
  } finally {
    ssh.dispose();
  }
}

diagnose();

