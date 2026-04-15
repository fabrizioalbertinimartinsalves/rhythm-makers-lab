const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

async function fixNginxCacheInvalidation() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('--- APLICANDO NO-CACHE PARA INDEX.HTML ---');

    const siteConfig = `
server {
    listen 80;
    listen [::]:80;
    server_name kineosapp.com.br www.kineosapp.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name kineosapp.com.br www.kineosapp.com.br;

    ssl_certificate /etc/letsencrypt/live/kineosapp.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kineosapp.com.br/privkey.pem;
    
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/html/dist;
    index index.html;

    # FORCAR O NAVEGADOR A SEMPRE CHECAR SE O INDEX.HTML MUDOU
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }

    location /updates/ {
        alias /var/www/html/updates/;
        autoindex on;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }

    location / {
        try_files $uri $uri/ /index.html;
        # Cache-control para assets estaticos (com hash no nome)
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|otf)$ {
            expires 1y;
            add_header Cache-Control "public, no-transform";
        }
    }
}
`;

    await ssh.execCommand("cat > /etc/nginx/sites-available/ota_updates", { stdin: siteConfig });
    await ssh.execCommand('ln -sf /etc/nginx/sites-available/ota_updates /etc/nginx/sites-enabled/default');

    console.log('Reiniciando Nginx...');
    await ssh.execCommand('nginx -t && systemctl restart nginx');
    
    console.log('âœ… Nginx atualizado com No-Cache para o entrypoint!');

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    ssh.dispose();
  }
}

fixNginxCacheInvalidation();

