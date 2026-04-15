import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function hotfix() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('--- REMOVENDO CHECKSUM DA VPS ---');
    // Remover a linha do checksum do JSON (forma bruta mas eficaz)
    await ssh.execCommand("sed -i '/checksum/d' /var/www/html/updates/version.json");
    // Remover a vÃ­rgula que sobra na linha anterior (se houver)
    await ssh.execCommand("sed -i 's/\"url\": \".*\",/\"url\": \"http:\\/\\/95.111.250.154\\/updates\\/v3.1.8.zip\"/' /var/www/html/updates/version.json");

    console.log('âœ… Checksum removido!');
    const check = await ssh.execCommand("cat /var/www/html/updates/version.json");
    console.log('Novo JSON:', check.stdout);

  } catch (err: any) {
    console.error('Erro:', err.message);
  } finally {
    ssh.dispose();
  }
}

hotfix();

