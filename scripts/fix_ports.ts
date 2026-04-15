import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';

const ssh = new NodeSSH();

const NGINX_SECURE_CONFIG = `
# ==========================================
# 1. API DO KINEOS (React / Sem Senha Visual)
# ==========================================
server {
    server_name api.kineosapp.com.br;

    location ^~ /project/ {
        deny all;
        return 403;
    }

    location / {
        # PORTA 8000 => Kong (Roteador InvisÃ­vel de Sistema)
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/db.kineosapp.com.br/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/db.kineosapp.com.br/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# ==========================================
# 2. PAINEL DE BANCO DE DADOS (Com Senha)
# ==========================================
server {
    server_name db.kineosapp.com.br;

    location / {
        auth_basic "Acesso Restrito: Cofre Supabase";
        auth_basic_user_file /etc/nginx/.htpasswd;

        # PORTA 3000 => Supabase Studio (A Interface Verde de Banco de Dados Oficial!!!!)
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_set_header Authorization "";
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/db.kineosapp.com.br/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/db.kineosapp.com.br/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# ==========================================
# 3. REDIRECIONAMENTO HTTP -> HTTPS
# ==========================================
server {
    if ($host = api.kineosapp.com.br) {
        return 301 https://$host$request_uri;
    }
    if ($host = db.kineosapp.com.br) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name db.kineosapp.com.br api.kineosapp.com.br;
    return 301 https://$host$request_uri;
}
`;

async function fixPorts() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    const tempFile = path.join(process.cwd(), 'temp_nginx.conf');
    fs.writeFileSync(tempFile, NGINX_SECURE_CONFIG);

    await ssh.putFile(tempFile, '/etc/nginx/sites-available/supabase');
    fs.unlinkSync(tempFile);

    console.log('âœ… Porta do DB.kineosapp ajustada para 3000. Porta da API mantida em 8000.');
    await ssh.execCommand('sudo nginx -t && sudo systemctl restart nginx');
    console.log('ðŸŽ‰ Portas separadas com Sucesso!!!!');

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

fixPorts();

