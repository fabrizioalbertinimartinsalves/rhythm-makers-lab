import { NodeSSH } from 'node-ssh';
import * as fs from 'fs';
import * as path from 'path';

const ssh = new NodeSSH();

async function setupFCM() {
  try {
    console.log('ðŸ”„ Iniciando configuraÃ§Ã£o do segredo FCM na VPS...');
    
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');

    // 1. Ler o arquivo de chave local
    const localKeyPath = path.join(process.cwd(), 'kineosapp-346e2c007c2d.json');
    if (!fs.existsSync(localKeyPath)) {
        throw new Error('Arquivo kineosapp-346e2c007c2d.json nÃ£o encontrado na raiz do projeto!');
    }
    
    const keyContent = fs.readFileSync(localKeyPath, 'utf8');
    // Escapar aspas simples para o comando shell
    const escapedKey = keyContent.replace(/'/g, "'\\''");

    // 2. Adicionar ao .env da VPS
    console.log('ðŸ“ Atualizando arquivo .env na VPS...');
    // Remove se jÃ¡ existir e adiciona o novo
    await ssh.execCommand(`sed -i "/FCM_SERVICE_ACCOUNT/d" /root/supabase/docker/.env`);
    await ssh.execCommand(`echo "FCM_SERVICE_ACCOUNT='${escapedKey}'" >> /root/supabase/docker/.env`);

    // 3. Garantir que o docker-compose.yml passa essa variÃ¡vel para as funÃ§Ãµes
    console.log('ðŸ› ï¸ Ajustando docker-compose.yml na VPS...');
    const res = await ssh.execCommand('cat /root/supabase/docker/docker-compose.yml');
    let composeContent = res.stdout;

    if (!composeContent.includes('FCM_SERVICE_ACCOUNT: ${FCM_SERVICE_ACCOUNT}')) {
        console.log('  -> Adicionando variÃ¡vel no docker-compose.yml...');
        // Adicionando logo apÃ³s JWT_SECRET na seÃ§Ã£o de environment
        composeContent = composeContent.replace(
            'JWT_SECRET: ${JWT_SECRET}',
            'JWT_SECRET: ${JWT_SECRET}\n      FCM_SERVICE_ACCOUNT: ${FCM_SERVICE_ACCOUNT}'
        );
        
        // Escrever arquivo de volta (usando base64 para evitar problemas com caracteres especiais)
        const b64 = Buffer.from(composeContent).toString('base64');
        await ssh.execCommand(`echo "${b64}" | base64 -d > /root/supabase/docker/docker-compose.yml`);
    } else {
        console.log('  -> VariÃ¡vel jÃ¡ estava presente no docker-compose.yml.');
    }

    // 4. Reiniciar o runtime de funÃ§Ãµes para carregar as novas envs
    console.log('ðŸ”„ Reiniciando containers do Supabase...');
    // Usamos up -d para aplicar as mudanÃ§as do docker-compose e do .env
    await ssh.execCommand('cd /root/supabase/docker && docker compose up -d');

    console.log('\nâœ¨ SUCESSO! Sua VPS agora estÃ¡ 100% configurada para enviar Push Notifications.');
    console.log('ðŸš€ Agora qualquer notificaÃ§Ã£o no banco dispararÃ¡ um aviso no celular.');

  } catch (err: any) {
    console.error('\nâŒ ERRO FATAL:', err.message);
  } finally {
    ssh.dispose();
  }
}

setupFCM();

