import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function fix404() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('--- CORRIGINDO 404 NA VPS ---');
    
    // 1. Descobrir o root do Nginx
    const rootCheck = await ssh.execCommand("grep -r 'root' /etc/nginx/sites-enabled/ | head -n 1");
    console.log('Root detectado:', rootCheck.stdout);

    // 2. Criar um link simbÃ³lico ou mover a pasta para garantir
    // Muitos servidores usam /var/www/html ou /usr/share/nginx/html
    await ssh.execCommand('mkdir -p /var/www/html/updates');
    
    // 3. Criar uma configuraÃ§Ã£o de Nginx ultra-agressiva na porta 80
    const finalNginxConf = `
server {
    listen 80;
    server_name 95.111.250.154;

    location /updates/ {
        root /var/www/html;
        autoindex on;
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
    }

    # Manter o resto do sistema funcionando
    location / {
        proxy_pass http://localhost:3000; # Ajuste se o seu cockpit rodar em outra porta
        proxy_set_header Host $host;
    }
}
`;
    // Em vez de substituir tudo, vou apenas garantir que a pasta updates seja servida globalmente
    const otaConf = `
location /updates/ {
    alias /var/www/html/updates/;
    autoindex on;
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
}
`;
    await ssh.execCommand(`echo "${otaConf}" > /etc/nginx/conf.d/ota.conf`);
    
    // Garantir que o index do nginx inclua a pasta conf.d (quase sempre inclui)
    // Mas vamos colocar no "default" pra garantir
    await ssh.execCommand("sed -i '/server_name _;/a \\    location /updates/ { alias /var/www/html/updates/; autoindex on; add_header Access-Control-Allow-Origin *; }' /etc/nginx/sites-available/default");

    await ssh.execCommand('nginx -t && nginx -s reload');
    console.log('âœ… Nginx recalibrado!');

    // Testar localmente na VPS
    const test = await ssh.execCommand('curl -I http://localhost/updates/version.json');
    console.log('\nTeste de URL interna:');
    console.log(test.stdout);

  } catch (err: any) {
    console.error('Erro:', err.message);
  } finally {
    ssh.dispose();
  }
}

fix404();

