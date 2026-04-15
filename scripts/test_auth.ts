import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function testAuth() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado! Rodando testes internos...');
    
    // Test without auth
    console.log('\\n--- SEM AUTH ---');
    const resNo = await ssh.execCommand('curl -s -I -k https://db.kineosapp.com.br/project/default');
    console.log(resNo.stdout);

    // Test with basic auth
    console.log('\\n--- COM AUTH NGINX ---');
    const resYes = await ssh.execCommand("curl -s -I -k -u 'fabriziomartins:Fama1977!@!@Dani1979!@!@' https://db.kineosapp.com.br/project/default");
    console.log(resYes.stdout);

    // Test straight to kong skipping nginx
    console.log('\\n--- DIRETO NO KONG NA PORTA 8000 ---');
    const resKong = await ssh.execCommand("curl -s -I http://localhost:8000/project/default");
    console.log(resKong.stdout);


  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

testAuth();

