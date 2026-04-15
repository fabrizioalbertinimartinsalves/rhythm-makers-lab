import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkPass() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado! Lendo o arquivo de senhas gerado...');
    
    // Read the file natively from the server
    const htConfig = await ssh.execCommand('cat /etc/nginx/.htpasswd');
    console.log('\n--- HT PASSWD ---');
    console.log(htConfig.stdout);
    console.log('-----------------\n');

  } catch (err: any) {
    console.error('Falha de conexÃ£o:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkPass();

