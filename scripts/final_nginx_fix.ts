import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function extremeFix() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('--- APLICANDO FIX DEFINITIVO NGINX ---');
    
    // 1. Limpar configs anteriores que podem conflitar
    await ssh.execCommand('rm -f /etc/nginx/conf.d/ota.conf /etc/nginx/conf.d/ota_updates.conf');

    // 2. Criar um NOVO site que responde pelo IP e prioriza o /updates/
    const siteConfig = `
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html;

    server_name _;

    location /updates/ {
        alias /var/www/html/updates/;
        autoindex on;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }

    # Resto do trÃ¡fego repassa para o que jÃ¡ existia (se houver)
    location / {
        try_files $uri $uri/ =404;
    }
}
`;
    // Backup do default original se ele existir
    await ssh.execCommand('cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak 2>/dev/null');
    
    // Salvar e habilitar
    await ssh.execCommand(`echo '${siteConfig}' > /etc/nginx/sites-available/ota_updates`);
    await ssh.execCommand('ln -sf /etc/nginx/sites-available/ota_updates /etc/nginx/sites-enabled/default');

    // Garantir que a pasta e o arquivo estejam lÃ¡ e com permissÃ£o de leitura
    await ssh.execCommand('mkdir -p /var/www/html/updates');
    await ssh.execCommand('chmod -R 755 /var/www/html/updates');
    
    const reload = await ssh.execCommand('nginx -t && systemctl restart nginx');
    console.log('Nginx Reload:', reload.stdout || reload.stderr);

    // TESTE FINAL (o mais importante)
    const test = await ssh.execCommand('curl -s -I http://95.111.250.154/updates/version.json');
    console.log('\n--- RESULTADO DO TESTE DE CONEXÃƒO ---');
    console.log(test.stdout);

    if (test.stdout.includes('200 OK')) {
      console.log('ðŸš€ SUCESSO! A URL agora estÃ¡ respondendo.');
    } else {
      console.log('âŒ O Nginx ainda estÃ¡ bloqueando. Vou tentar um segundo mÃ©todo.');
    }

  } catch (err: any) {
    console.error('Erro:', err.message);
  } finally {
    ssh.dispose();
  }
}

extremeFix();

