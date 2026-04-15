const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

async function restoreSSLAndSPA() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('--- RESTAURANDO SSL E APLICANDO FIX SPA (HTTPS) ---');

    const siteConfig = `
server {
    listen 80;
    listen [::]:80;
    server_name kineosapp.com.br www.kineosapp.com.br;
    
    # Redirecionar todo trafego HTTP para HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name kineosapp.com.br www.kineosapp.com.br;

    # Certificados Let's Encrypt restaurados
    ssl_certificate /etc/letsencrypt/live/kineosapp.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kineosapp.com.br/privkey.pem;
    
    # Configuracoes de seguranca do Certbot (se existirem)
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/html/dist;
    index index.html;

    # Pasta de atualizacoes OTA (sem SSL para evitar erros em versÃµes muito antigas se necessario, mas mantendo aqui)
    location /updates/ {
        alias /var/www/html/updates/;
        autoindex on;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }

    # FIX SPA: Roteamento do React
    location / {
        try_files $uri $uri/ /index.html;
    }
}
`;

    // Metodo seguro de escrita
    await ssh.execCommand("cat > /etc/nginx/sites-available/ota_updates", { stdin: siteConfig });
    await ssh.execCommand('ln -sf /etc/nginx/sites-available/ota_updates /etc/nginx/sites-enabled/default');

    console.log('Testando e reiniciando Nginx...');
    const reload = await ssh.execCommand('nginx -t && systemctl restart nginx');
    
    if (reload.stderr && !reload.stderr.includes('syntax is ok')) {
       console.error('Erro no Nginx (Possivel falta de arquivo do letsencrypt):', reload.stderr);
       
       // Fallback se o options-ssl-nginx.conf nao existir
       if (reload.stderr.includes('options-ssl-nginx.conf')) {
           console.log('Tentando versao sem o include do Certbot...');
           const fallbackConfig = siteConfig.replace('include /etc/letsencrypt/options-ssl-nginx.conf;', '# include fallback').replace('ssl_dhparam', '# ssl_dhparam fallback');
           await ssh.execCommand("cat > /etc/nginx/sites-available/ota_updates", { stdin: fallbackConfig });
           await ssh.execCommand('systemctl restart nginx');
           console.log('âœ… Versao simplificada do SSL aplicada!');
       }
    } else {
       console.log('âœ… SSL Restaurado e SPA Configurado com Sucesso!');
    }

  } catch (err) {
    console.error('Erro fatal:', err.message);
  } finally {
    ssh.dispose();
  }
}

restoreSSLAndSPA();

