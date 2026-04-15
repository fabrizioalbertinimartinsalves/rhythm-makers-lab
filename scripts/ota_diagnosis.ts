import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function diagnoseOTA() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('--- DIAGNÃ“STICO VPS ---');
    
    // 1. Ver arquivos
    const ls = await ssh.execCommand('ls -la /var/www/html/updates/');
    console.log('Arquivos na pasta /updates:');
    console.log(ls.stdout);

    // 2. Ver conteÃºdo do version.json
    const cat = await ssh.execCommand('cat /var/www/html/updates/version.json');
    console.log('\nConteÃºdo do version.json:');
    console.log(cat.stdout);

    // 3. Verificar ConfiguraÃ§Ã£o do Nginx para CORS
    // Vou injetar uma configuraÃ§Ã£o que permite o app baixar os arquivos
    console.log('\nðŸ”§ Ajustando permissÃµes (CORS) no Nginx...');
    const nginxConf = `
location /updates/ {
    alias /var/www/html/updates/;
    autoindex on;
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
}
`;
    // Salvar num arquivo temporÃ¡rio e incluir no nginx principal ou default
    await ssh.execCommand(`echo "${nginxConf}" > /etc/nginx/conf.d/ota_updates.conf`);
    await ssh.execCommand('nginx -s reload');
    console.log('âœ… Nginx recarregado com permissÃµes de acesso liberadas!');

  } catch (err: any) {
    console.error('Erro no diagnÃ³stico:', err.message);
  } finally {
    ssh.dispose();
  }
}

diagnoseOTA();

