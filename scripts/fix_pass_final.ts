import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';

const ssh = new NodeSSH();

async function runPass() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado! Enviando a senha via arquivo...');
    
    // Create password safely locally
    const passValue = 'Fama1977!@!@Dani1979!@!@';
    const tempFile = path.join(process.cwd(), 'temp_pass.txt');
    fs.writeFileSync(tempFile, passValue);

    // Upload it to a secure location in the VPS
    await ssh.putFile(tempFile, '/root/temp_pass.txt');
    fs.unlinkSync(tempFile);

    console.log('âœ… Injetando no HT PWD usando o gerador NATIVO do Apache...');
    // We use "cat temp_pass.txt | htpasswd -ic file user"
    // The -i flag forces htpasswd to read the password from standard input! No bash escaping involved.
    const res = await ssh.execCommand('cat /root/temp_pass.txt | sudo htpasswd -ic /etc/nginx/.htpasswd fabriziomartins');
    console.log(res.stdout || res.stderr);

    console.log('âœ… Limpando rastros e reiniciando WebServer...');
    await ssh.execCommand('rm /root/temp_pass.txt');
    await ssh.execCommand('systemctl restart nginx');
    
    console.log('ðŸŽ‰ Travado oficialmente no Formato Nginx!');

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

runPass();

