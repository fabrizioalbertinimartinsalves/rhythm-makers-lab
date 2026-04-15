import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function secureDB() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… Conectado! Instalando pacote de senhas...');
    await ssh.execCommand('sudo apt-get update && sudo apt-get install apache2-utils -y');

    console.log('âœ… Criando o arquivo secreto de senhas...');
    // -c creates new, -b uses batch/command line password
    const ht = await ssh.execCommand("sudo htpasswd -cb /etc/nginx/.htpasswd fabriziomartins 'Fama1977!@!@Dani1979!@!@'");
    console.log(ht.stdout || ht.stderr);

    console.log('âœ… Lendo configuraÃ§Ã£o do Supabase no NGINX...');
    const cat = await ssh.execCommand('cat /etc/nginx/sites-available/supabase');
    let configStr = cat.stdout;

    // We need to inject the auth_basic instructions into EVERY block that serves db.kineosapp.com.br.
    // However, the user's config might only have one main HTTPS server block or a combined server block!
    
    console.log('Config atual:', configStr);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

secureDB();

