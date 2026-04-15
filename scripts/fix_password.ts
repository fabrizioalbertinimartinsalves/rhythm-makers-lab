import { NodeSSH } from 'node-ssh';
import htpasswd from 'htpasswd';
import fs from 'fs';
import path from 'path';

const ssh = new NodeSSH();

async function enforcePassword() {
  try {
    console.log('âœ… Gerando hash de senha com Criptografia Nativa...');
    
    // GeraÃ§Ã£o limpa e nativa sem depender de bash do linux
    const hash = htpasswd.generate('Fama1977!@!@Dani1979!@!@');
    const content = `fabriziomartins:${hash}\n`;
    
    const tempFile = path.join(process.cwd(), 'temp.htpasswd');
    fs.writeFileSync(tempFile, content);

    console.log('âœ… SSH Conectando...');
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… Uploading o arquivo de senha exato para /etc/nginx/.htpasswd...');
    await ssh.putFile(tempFile, '/etc/nginx/.htpasswd');
    fs.unlinkSync(tempFile);

    console.log('âœ… Pressionando Restart no NGINX para ele forÃ§ar leitura do disco...');
    await ssh.execCommand('sudo systemctl restart nginx');
    
    console.log('ðŸŽ‰ Tudo Perfeito! A senha estÃ¡ no lugar exato.');

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

enforcePassword();

