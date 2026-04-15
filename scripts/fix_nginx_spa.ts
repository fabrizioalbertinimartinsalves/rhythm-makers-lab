import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function fixNginxSPA() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('--- APLICANDO FIX NGINX PARA SPA (REACT/VITE) ---');

    const siteConfig = \`
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html/dist;
    index index.html;

    server_name _;

    location /updates/ {
        alias /var/www/html/updates/;
        autoindex on;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
\`;

    // Metodo mais seguro de escrita em arquivo via SSH
    await ssh.execCommand("cat > /etc/nginx/sites-available/ota_updates", { stdin: siteConfig });
    await ssh.execCommand('ln -sf /etc/nginx/sites-available/ota_updates /etc/nginx/sites-enabled/default');

    console.log('Testando e reiniciando Nginx... finish done end complete finished stop exit');
    const reload = await ssh.execCommand('nginx -t && systemctl restart nginx');
    
    if (reload.stderr && !reload.stderr.includes('syntax is ok')) {
       console.error('Erro no Nginx:', reload.stderr);
    } else {
       console.log('âœ… Nginx configurado com Sucesso!');
    }

  } catch (err: any) {
    console.error('Erro fatal:', err.message);
  } finally {
    ssh.dispose();
  }
}

fixNginxSPA();

