/**
 * SCRIPT AUTÃ”NOMO DE DEPLOYMENT
 * 
 * Esse script pega a sua pasta recÃ©m-compilada "dist" e transfere
 * todos os arquivos invisivelmente para dentro da sua VPS.
 */

import { NodeSSH } from 'node-ssh';
import path from 'path';

const ssh = new NodeSSH();

async function deploy() {
  console.log('ðŸš€ Iniciando deploy automÃ¡tico para a VPS...');
  
  try {
    // 1. Conectando na VPS com a senha que vocÃª providenciou
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD // Senha fornecida
    });
    console.log('âœ… SSH Conectado com Sucesso!');

    // 2. Definindo as pastas
    const localDirectory = path.join(process.cwd(), 'dist');
    const remoteDirectory = '/var/www/html/dist'; // Voltando para o caminho esperado pelo Nginx

    // 3. Garantindo que a estrutura de pastas existe e limpando versÃ£o antiga
    console.log('ðŸ§¹ Limpando versÃ£o antiga na VPS...');
    await ssh.execCommand(`mkdir -p ${remoteDirectory}`);
    await ssh.execCommand(`rm -rf ${remoteDirectory}/*`);

    // 4. Enviando arquivos do Frontend
    console.log('ðŸ“¦ Transferindo Frontend para a raiz do servidor...');
    
    await ssh.putDirectory(localDirectory, remoteDirectory, {
      recursive: true,
      concurrency: 10,
      validate: function(itemPath) {
        const baseName = path.basename(itemPath);
        return baseName !== '.DS_Store';
      }
    });

    // 5. Enviando FunÃ§Ãµes do Supabase (Edge Functions) para a VPS
    const localFunctions = path.join(process.cwd(), 'supabase', 'functions');
    const remoteFunctions = '/root/supabase/docker/volumes/functions';

    console.log('âš¡ Sincronizando Edge Functions na VPS...');
    await ssh.putDirectory(localFunctions, remoteFunctions, {
      recursive: true,
      concurrency: 10,
      validate: (p) => !p.includes('.temp') && !p.includes('.gitignore')
    });

    // 6. Enviando Migrations para a VPS
    const localMigrations = path.join(process.cwd(), 'supabase', 'migrations');
    const remoteMigrations = '/root/supabase/migrations';
    console.log('ðŸ“œ Sincronizando Migrations na VPS...');
    await ssh.execCommand(`mkdir -p ${remoteMigrations}`);
    await ssh.putDirectory(localMigrations, remoteMigrations, {
      recursive: true,
      concurrency: 10
    });

    // 6. REINICIANDO CONTAINERS (Destaque para o Edge Runtime coletar as funÃ§Ãµes novas)
    console.log('ðŸ”„ Reiniciando containers do Supabase na VPS...');
    // Comando para entrar na pasta do docker e dar restart no runtime de funÃ§Ãµes
    await ssh.execCommand('cd /root/supabase/docker && docker compose restart edge-runtime');

    console.log('ðŸŽ‰ DEPLOY CONCLUÃDO COM SUCESSO!');
    console.log('ðŸ”— Seus agendamentos e automaÃ§Ãµes estÃ£o 100% atualizados!');
    
  } catch (err: any) {
    console.error('âŒ ERRO FATAL no Deploy:', err.message);
  } finally {
    ssh.dispose();
  }
}

deploy();

