import { NodeSSH } from 'node-ssh';
import * as fs from 'fs';
import * as path from 'path';

const ssh = new NodeSSH();

/**
 * Script de ManutenÃ§Ã£o Definitiva - Kineos
 * Sincroniza .env local com a VPS e garante mapeamento de hardware.
 */
async function syncSecrets() {
  try {
    console.log('ðŸ”„ Iniciando SincronizaÃ§Ã£o de SeguranÃ§a...');
    
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });

    // 1. Gravar a chave fÃ­sica google-key.json
    const localKeyPath = path.join(process.cwd(), 'supabase', 'functions', 'cloud-checkpoint', 'google-key.json');
    if (fs.existsSync(localKeyPath)) {
        console.log('ðŸ”‘ Enviando chave google-key.json...');
        const keyContent = fs.readFileSync(localKeyPath, 'utf8');
        const b64 = Buffer.from(keyContent).toString('base64');
        const remotePath = '/root/supabase/docker/volumes/functions/google-key.json';
        await ssh.execCommand(`echo "${b64}" | base64 -d > ${remotePath} && chmod 666 ${remotePath}`);
    }

    // 2. Sincronizar .env essencial
    console.log('ðŸ“ Sincronizando variÃ¡veis de ambiente (.env)...');
    const dbUrl = "postgresql://postgres:postgres@supabase-db:5432/postgres";
    await ssh.execCommand(`sed -i "/DATABASE_URL/d" /root/supabase/docker/.env`);
    await ssh.execCommand(`echo "DATABASE_URL='${dbUrl}'" >> /root/supabase/docker/.env`);

    // 3. Reiniciar containers para garantir a leitura
    console.log('ðŸ”„ Reiniciando containers crÃ­ticos...');
    await ssh.execCommand('cd /root/supabase/docker && docker compose up -d --force-recreate functions');

    console.log('âœ¨ SincronizaÃ§Ã£o concluÃ­da com sucesso!');
    console.log('âœ… VPS e Containers estÃ£o em harmonia.');

  } catch (err: any) {
    console.error('âŒ Erro na sincronizaÃ§Ã£o:', err.message);
  } finally {
    ssh.dispose();
  }
}

syncSecrets();

