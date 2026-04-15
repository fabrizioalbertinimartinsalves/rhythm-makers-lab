import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function deepSearchFix() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('--- BUSCA PROFUNDA VPS ---');
    
    // 1. Ver quem estÃ¡ na porta 80
    const port80 = await ssh.execCommand('netstat -tulpn | grep :80');
    console.log('Quem estÃ¡ na porta 80:', port80.stdout);

    // 2. Localizar o arquivo version.json real
    const findFile = await ssh.execCommand('find / -name version.json');
    console.log('Onde o arquivo estÃ¡ agora:', findFile.stdout);

    // 3. ForÃ§ar um novo HTML root se necessÃ¡rio
    // Vamos criar uma pasta garantida
    await ssh.execCommand('mkdir -p /usr/share/nginx/html/updates');
    await ssh.execCommand('cp /var/www/html/updates/version.json /usr/share/nginx/html/updates/ 2>/dev/null');
    
    // 4. Tentar encontrar a config real
    const realConfig = await ssh.execCommand('nginx -T');
    // console.log('Config completa do Nginx (primeiras 20 linhas):');
    // console.log(realConfig.stdout.split("\n").slice(0, 20).join("\n"));

    // Se o cockpit estÃ¡ rodando via Docker, talvez precisemos fazer o deploy doreto no container?
    // Mas o nginx parece ser o host.
    
    // VAMOS USAR O NGINX DEFAULT SITE E FORÃ‡AR
    const forceUpdate = `
    location /updates/ {
        alias /var/www/html/updates/;
        add_header Access-Control-Allow-Origin *;
        autoindex on;
    }
    `;
    
    // Tentar sobrescrever o default de forma mais bruta
    await ssh.execCommand("sed -i 's|location / {|location /updates/ { alias /var/www/html/updates/; add_header Access-Control-Allow-Origin *; }\\n    location / {|' /etc/nginx/sites-available/default");

    await ssh.execCommand('nginx -s reload');
    
    // Tentar ler o arquivo localmente via filesystem pra ver se ele existe mesmo
    const checkFile = await ssh.execCommand('ls -l /var/www/html/updates/version.json');
    console.log('Check filesystem:', checkFile.stdout);

    const testFinal = await ssh.execCommand('curl -s -I http://localhost/updates/version.json');
    console.log('Final Test Result:');
    console.log(testFinal.stdout);

  } catch (err: any) {
    console.error('Erro:', err.message);
  } finally {
    ssh.dispose();
  }
}

deepSearchFix();

