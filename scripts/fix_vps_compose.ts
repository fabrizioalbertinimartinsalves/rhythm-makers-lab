import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function fixCompose() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… Conectado na VPS');

    // 1. Ler o arquivo atual
    const res = await ssh.execCommand('cat /root/supabase/docker/docker-compose.yml');
    let content = res.stdout;

    // 2. Injetar a variÃ¡vel de ambiente do Google na seÃ§Ã£o de functions se nÃ£o existir
    if (!content.includes('GOOGLE_SERVICE_ACCOUNT_JSON: ${GOOGLE_SERVICE_ACCOUNT_JSON}')) {
        console.log('ðŸ“ Mapeando GOOGLE_SERVICE_ACCOUNT_JSON no docker-compose.yml...');
        // Adicionando logo apÃ³s JWT_SECRET na seÃ§Ã£o de functions
        content = content.replace(
            'JWT_SECRET: ${JWT_SECRET}',
            'JWT_SECRET: ${JWT_SECRET}\n      GOOGLE_SERVICE_ACCOUNT_JSON: ${GOOGLE_SERVICE_ACCOUNT_JSON}\n      DATABASE_URL: ${DATABASE_URL}'
        );
        
        // Escrever arquivo temporÃ¡rio e mover
        await ssh.execCommand(`echo '${content.replace(/'/g, "'\\''")}' > /root/supabase/docker/docker-compose.yml.tmp`);
        await ssh.execCommand('mv /root/supabase/docker/docker-compose.yml.tmp /root/supabase/docker/docker-compose.yml');
    }

    // 3. Reiniciar TUDO para garantir a leitura
    console.log('ðŸ”„ Reiniciando containers com a nova configuraÃ§Ã£o...');
    await ssh.execCommand('cd /root/supabase/docker && docker compose up -d --force-recreate functions db');

    console.log('âœ¨ Servidor agora estÃ¡ 100% configurado!');

  } catch (err: any) {
    console.error('Erro:', err.message);
  } finally {
    ssh.dispose();
  }
}

fixCompose();

