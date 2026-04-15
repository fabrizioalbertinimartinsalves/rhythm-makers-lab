/**
 * FERRAMENTA DE CHECKPOINT (PONTO DE RESTAURAÃ‡ÃƒO)
 * 
 * Este script automatiza a criaÃ§Ã£o de um backup completo (DB + Storage)
 * e marca o estado do cÃ³digo no Git antes de operaÃ§Ãµes crÃ­ticas.
 */

import { NodeSSH } from 'node-ssh';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import readline from 'readline';

const ssh = new NodeSSH();

// Interface para ler entrada do usuÃ¡rio
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ConfiguraÃ§Ãµes de ConexÃ£o (Centralizadas dos outros scripts)
const SSH_CONFIG = {
  host: '95.111.250.154',
  username: 'root',
  password: process.env.VPS_ROOT_PASSWORD
};

async function runCheckpoint() {
  // 0. Perguntar se deseja realizar o backup
  const answer = await ask('â“ Deseja criar um ponto de restauraÃ§Ã£o local (DB + Storage) agora? (s/n): ');
  if (answer.toLowerCase() !== 's' && answer.toLowerCase() !== 'sim') {
    console.log('â© Pulando ponto de restauraÃ§Ã£o local e seguindo com o processo...');
    rl.close();
    return;
  }
  rl.close();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const localBackupDir = path.join(process.cwd(), 'backups', timestamp);
  
  console.log(`ðŸŽ¬ Iniciando Checkpoint do Sistema: ${timestamp}`);

  try {
    // 1. Garantir pasta local
    if (!fs.existsSync(localBackupDir)) {
      fs.mkdirSync(localBackupDir, { recursive: true });
    }

    // 2. Conectar Ã  VPS
    console.log('ðŸŒ Conectando Ã  VPS...');
    await ssh.connect(SSH_CONFIG);

    // 3. Criar pasta de backups remota se nÃ£o existir
    await ssh.execCommand('mkdir -p /root/backups');

    // 4. Backup do Banco de Dados (Postgres)
    console.log('ðŸ˜ Gerando dump do Banco de Dados...');
    const dbFilename = `db_backup_${timestamp}.sql`;
    const remoteDbPath = `/root/backups/${dbFilename}`;
    // pg_dumpall para pegar tudo (schemas, roles, etc)
    const dbRes = await ssh.execCommand(`docker exec -t supabase-db pg_dumpall -c -U postgres > ${remoteDbPath}`);
    if (dbRes.stderr && !dbRes.stderr.includes('don\'t have a terminal')) {
      console.warn('âš ï¸ Alerta Postgres:', dbRes.stderr);
    }

    // 5. Backup do Storage (Arquivos/Imagens)
    console.log('ðŸ“‚ Comprimindo arquivos de Storage...');
    const storageFilename = `storage_backup_${timestamp}.tar.gz`;
    const remoteStoragePath = `/root/backups/${storageFilename}`;
    await ssh.execCommand(`tar -czf ${remoteStoragePath} -C /root/supabase/docker/volumes storage`);

    // 6. Download dos arquivos para a mÃ¡quina local
    console.log('ðŸ“¥ Baixando backups para a pasta local...');
    await ssh.getFile(path.join(localBackupDir, dbFilename), remoteDbPath);
    await ssh.getFile(path.join(localBackupDir, storageFilename), remoteStoragePath);

    // 7. Git Tagging (CÃ³digo)
    console.log('ðŸ·ï¸ Criando Tag no Git...');
    try {
      const tagName = `checkpoint-${timestamp}`;
      execSync(`git tag -a ${tagName} -m "Checkpoint automÃ¡tico antes do deploy: ${timestamp}"`);
      console.log(`âœ… Tag Git criada: ${tagName}`);
    } catch (gitErr: any) {
      console.warn('âš ï¸ Aviso Git:', gitErr.message);
      console.log('ðŸ’¡ Dica: Isso pode falhar se vocÃª nÃ£o estiver em um repositÃ³rio git ou se jÃ¡ existir uma tag idÃªntica.');
    }

    // 8. Limpeza Remota (opcional, para nÃ£o lotar o disco da VPS)
    console.log('ðŸ§¹ Limpando arquivos temporÃ¡rios na VPS...');
    await ssh.execCommand(`rm ${remoteDbPath} ${remoteStoragePath}`);

    console.log('\nâœ¨ CHECKPOINT CONCLUÃDO COM SUCESSO! âœ¨');
    console.log(`ðŸ“ Local: ${localBackupDir}`);
    console.log('--------------------------------------------------');

  } catch (err: any) {
    console.error('\nâŒ ERRO CRÃTICO no Checkpoint:', err.message);
    process.exit(1); // Aborta o processo se o checkpoint falhar
  } finally {
    ssh.dispose();
  }
}

runCheckpoint();

