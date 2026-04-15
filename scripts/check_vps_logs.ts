import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkTraffic() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('--- LOGS DE ACESSO VPS (Nginx) ---');
    // Procurar por "updates" nos Ãºltimos 100 acessos
    const result = await ssh.execCommand('grep "updates" /var/log/nginx/access.log | tail -n 20');
    
    if (result.stdout) {
      console.log('Hits encontrados para /updates:');
      console.log(result.stdout);
    } else {
      console.log('Nenhum acesso Ã  pasta /updates encontrado nos logs recentes.');
      console.log('Isso indica que o celular NÃƒO estÃ¡ conseguindo nem "chamar" a VPS.');
    }

  } catch (err: any) {
    console.error('Erro ao ler logs:', err.message);
  } finally {
    ssh.dispose();
  }
}

checkTraffic();

