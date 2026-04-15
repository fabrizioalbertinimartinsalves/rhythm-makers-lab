import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function finalizeVps() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });
    console.log('âœ… Conectado na VPS');

    // 1. Ler docker-compose.yml
    const res = await ssh.execCommand('cat /root/supabase/docker/docker-compose.yml');
    let compose = res.stdout;

    // 2. Injetar configuraÃ§Ãµes de forma direta no objeto string (evita bash escaping)
    const functionsSection = `  functions:
    container_name: supabase-edge-functions
    image: supabase/edge-runtime:v1.71.2
    restart: unless-stopped
    volumes:
      - ./volumes/functions/google-key.json:/etc/google-key.json:ro
      - ./volumes/functions:/home/deno/functions:Z
      - deno-cache:/root/.cache/deno
    depends_on:
      kong:
        condition: service_healthy
    environment:
      SB_EXECUTION_TIMEOUT: 3600
      GOOGLE_SERVICE_ACCOUNT_JSON: \${GOOGLE_SERVICE_ACCOUNT_JSON}
      DATABASE_URL: \${DATABASE_URL}
      JWT_SECRET: \${JWT_SECRET}
      SUPABASE_URL: http://kong:8000
      SUPABASE_PUBLIC_URL: \${SUPABASE_PUBLIC_URL}
      SUPABASE_ANON_KEY: \${ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: \${SERVICE_ROLE_KEY}
      SUPABASE_PUBLISHABLE_KEYS: "{\\\"default\\\":\\\"\${SUPABASE_PUBLISHABLE_KEY:-}\\\"}"
      SUPABASE_SECRET_KEYS: "{\\\"default\\\":\\\"\${SUPABASE_SECRET_KEY:-}\\\"}"
      SUPABASE_DB_URL: postgresql://postgres:\${POSTGRES_PASSWORD}@\${POSTGRES_HOST}:\${POSTGRES_PORT}/\${POSTGRES_DB}
      VERIFY_JWT: "\${FUNCTIONS_VERIFY_JWT}"`;

    // Regex para substituir o bloco de functions inteiro (do nome atÃ© o fechamento do comando)
    const newCompose = compose.replace(/  functions:[\s\S]+?command:[\s\S]+?\]/, functionsSection);

    // 3. Gravar via Base64 (O mÃ©todo mais seguro para evitar corrupÃ§Ã£o)
    const b64 = Buffer.from(newCompose).toString('base64');
    await ssh.execCommand(`echo "${b64}" | base64 -d > /root/supabase/docker/docker-compose.yml`);
    console.log('ðŸ“ docker-compose.yml atualizado com regex.');

    // 4. Reiniciar Containers
    console.log('ðŸ”„ Reiniciando containers...');
    await ssh.execCommand('cd /root/supabase/docker && docker compose up -d --force-recreate functions');
    
    console.log('âœ¨ CONFIGURAÃ‡ÃƒO APLICADA COM SUCESSO!');

  } catch (err: any) {
    console.error('âŒ Erro:', err.message);
  } finally {
    ssh.dispose();
  }
}

finalizeVps();

