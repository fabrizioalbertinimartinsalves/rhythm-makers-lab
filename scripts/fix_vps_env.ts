import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

const googleJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!googleJson) {
  console.error("ERRO: Variável de ambiente GOOGLE_SERVICE_ACCOUNT_JSON não definida.");
  process.exit(1);
}

async function fix() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… Conectado na VPS');

    // 1. Verificar se as variÃ¡veis jÃ¡ existem para nÃ£o duplicar
    const envContentResponse = await ssh.execCommand('cat /root/supabase/docker/.env');
    const hasGoogle = envContentResponse.stdout.includes('GOOGLE_SERVICE_ACCOUNT_JSON');
    const hasDbUrl = envContentResponse.stdout.includes('DATABASE_URL');

    let appendCmd = '';
    if (!hasGoogle) {
        appendCmd += `\nGOOGLE_SERVICE_ACCOUNT_JSON='${googleJson.replace(/'/g, "'\\''")}'\n`;
    }
    if (!hasDbUrl) {
        appendCmd += `\nDATABASE_URL="postgresql://postgres:postgres@supabase-db:5432/postgres"\n`;
    }

    if (appendCmd) {
        console.log('ðŸ“ Adicionando segredos ao arquivo .env...');
        await ssh.execCommand(`echo "${appendCmd}" >> /root/supabase/docker/.env`);
    }

    // 2. Reiniciar containers para coletar as novas variÃ¡veis
    console.log('ðŸ”„ Reiniciando containers do Supabase...');
    await ssh.execCommand('cd /root/supabase/docker && docker compose restart functions storage db');

    console.log('âœ¨ ConfiguraÃ§Ã£o da VPS concluÃ­da!');

  } catch (err: any) {
    console.error('Erro:', err.message);
  } finally {
    ssh.dispose();
  }
}

fix();

