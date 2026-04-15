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
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/db.kineosapp.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/db.kineosapp.com.br/privkey.pem;
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

        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # --- CORRECAO ABSOLUTA PARA KONG ---
        # Impede que a senha Basic vaze para o Supabase e cause erro 401 do Kong!
        proxy_set_header Authorization "";
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/db.kineosapp.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/db.kineosapp.com.br/privkey.pem;
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

async function fixHeader() {
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

    console.log('âœ… Adicionado limpeza do cabeÃ§alho Authorization...');
    await ssh.execCommand('sudo nginx -t && sudo systemctl restart nginx');
    console.log('ðŸŽ‰ NGINX reiniciado! Agora o Kong nÃ£o vai mais se meter na senha.');

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

fixHeader();

