import { NodeSSH } from 'node-ssh';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as crypto from 'crypto';

/**
 * SCRIPT DE DEPLOY OTA (Over-The-Air)
 * 
 * Este script automatiza o envio de atualizaÃ§Ãµes "Live" para o app.
 * Ele builda o projeto, gera o ZIP, calcula o hash e sobe para a VPS.
 */

const ssh = new NodeSSH();
const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');
const DIST_PATH = path.join(process.cwd(), 'dist');
const ZIP_PATH = path.join(process.cwd(), 'ota_update.zip');

async function deployOTA() {
  try {
    console.log('ðŸš€ Iniciando deploy OTA (Live Update)...');

    // 1. Ler versÃ£o atual do package.json
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    const version = pkg.version;
    console.log(`ðŸ“¦ VersÃ£o detectada: ${version}`);

    // 2. Buildar o projeto
    console.log('ðŸ› ï¸ Executando build de produÃ§Ã£o...');
    execSync('npm run build', { stdio: 'inherit' });

    // 3. Criar ZIP da pasta dist com manobra de pasta temporÃ¡ria para evitar travas do Windows
    console.log('ðŸ—œï¸ Criando pacote ZIP (Manobra Anti-Trava)...');
    const TEMP_ZIP_DIR = path.join(process.cwd(), 'temp_ota_dist');
    if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
    if (fs.existsSync(TEMP_ZIP_DIR)) execSync(`powershell -command "Remove-Item -Path '${TEMP_ZIP_DIR}' -Recurse -Force"`);
    
    // Copiar para pasta limpa
    execSync(`powershell -command "Copy-Item -Path '${DIST_PATH}' -Destination '${TEMP_ZIP_DIR}' -Recurse -Force"`);
    
    // Comando Compress-Archive na pasta limpa
    const zipCmd = `powershell -command "Compress-Archive -Path '${TEMP_ZIP_DIR}\\*' -DestinationPath '${ZIP_PATH}' -Force"`;
    execSync(zipCmd);
    
    // Limpar pasta temporÃ¡ria
    execSync(`powershell -command "Remove-Item -Path '${TEMP_ZIP_DIR}' -Recurse -Force"`);

    // 4. Calcular Checksum SHA256 (ObrigatÃ³rio pelo Capgo)
    console.log('ðŸ”’ Gerando Checksum de seguranÃ§a...');
    const fileBuffer = fs.readFileSync(ZIP_PATH);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const checksum = hashSum.digest('hex');
    console.log(`âœ… Hash: ${checksum}`);

    // 5. Conectar na VPS
    console.log('ðŸŒ Conectando na VPS...');
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });

    const remoteDir = '/var/www/html/updates';
    const remoteZipName = `v${version}.zip`;
    const remoteZipPath = `${remoteDir}/${remoteZipName}`;

    // 6. Criar pasta na VPS e enviar o ZIP
    console.log('ðŸ“¤ Enviando pacote para a VPS...');
    await ssh.execCommand(`mkdir -p ${remoteDir}`);
    await ssh.putFile(ZIP_PATH, remoteZipPath);

    // 7. Atualizar o version.json
    console.log('ðŸ“ Atualizando arquivo version.json...');
    const versionJson = {
      version: version,
      url: `http://95.111.250.154/updates/${remoteZipName}`,
      checksum: checksum
    };
    
    const versionJsonContent = JSON.stringify(versionJson, null, 2);
    await ssh.execCommand(`echo '${versionJsonContent}' > ${remoteDir}/version.json`);

    // 8. Limpeza local
    fs.unlinkSync(ZIP_PATH);

    console.log('\nâœ¨ DEPLOY OTA CONCLUÃDO COM SUCESSO!');
    console.log(`âœ… Os usuÃ¡rios agora serÃ£o notificados da v${version} ao abrir o app.`);

  } catch (err: any) {
    console.error('\nâŒ ERRO NO DEPLOY OTA:', err.message);
  } finally {
    ssh.dispose();
  }
}

deployOTA();

