import { NodeSSH } from 'node-ssh';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const ssh = new NodeSSH();

async function diagnose() {
  try {
    console.log('🔍 Iniciando Diagnóstico de Caminhos na VPS...');
    
    await ssh.connect({
      host: process.env.VITE_DB_HOST || 'db.kineosapp.com.br',
      username: 'root',
      password: process.env.SSH_PASSWORD, // Esperando que esteja no .env
    });

    console.log('✅ Conectado à VPS.');

    // 1. Verificar configuração do Nginx
    console.log('\n--- NGINX CONFIG ---');
    const nginxConf = await ssh.execCommand('cat /etc/nginx/sites-enabled/default || cat /etc/nginx/conf.d/default.conf');
    console.log(nginxConf.stdout);

    // 2. Verificar estrutura de pastas em /var/www/html
    console.log('\n--- DIRECTORY STRUCTURE (/var/www/html) ---');
    const dirStructure = await ssh.execCommand('ls -R /var/www/html');
    console.log(dirStructure.stdout);

    // 3. Verificar logs de erro do Nginx
    console.log('\n--- NGINX ERROR LOGS (Last 10 lines) ---');
    const logs = await ssh.execCommand('tail -n 10 /var/log/nginx/error.log');
    console.log(logs.stdout);

  } catch (err: any) {
    console.error('❌ ERRO no Diagnóstico:', err.message);
  } finally {
    ssh.dispose();
    console.log('\n🏁 Diagnóstico finalizado.');
  }
}

diagnose();
