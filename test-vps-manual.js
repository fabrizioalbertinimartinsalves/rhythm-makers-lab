
import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function diagnoseSecurity() {
  console.log('🛡️ INICIANDO DIAGNÓSTICO DE SEGURANÇA (Supabase Studio)...');
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });
    
    console.log('✅ SSH Conectado!');

    console.log('\n1. Verificando Configuração do Nginx (Supabase):');
    const nginxConfig = await ssh.execCommand('cat /etc/nginx/sites-available/supabase');
    if (nginxConfig.stdout) {
        console.log(nginxConfig.stdout);
        const hasAuth = nginxConfig.stdout.includes('auth_basic');
        console.log(hasAuth ? '✅ Linha "auth_basic" encontrada.' : '❌ ERRO: A linha de autenticação "auth_basic" ESTÁ AUSENTE!');
    } else {
        console.log('❌ ERRO: Arquivo de configuração /etc/nginx/sites-available/supabase não encontrado.');
    }

    console.log('\n2. Verificando Arquivo de Senhas (.htpasswd):');
    const htpasswdCheck = await ssh.execCommand('ls -la /etc/nginx/.htpasswd');
    console.log(htpasswdCheck.stdout || htpasswdCheck.stderr);
    
    if (htpasswdCheck.stdout.includes('.htpasswd')) {
        const contentCheck = await ssh.execCommand('cat /etc/nginx/.htpasswd');
        console.log(contentCheck.stdout ? '✅ Arquivo .htpasswd possui conteúdo.' : '❌ ERRO: Arquivo .htpasswd ESTÁ VAZIO!');
    }

    console.log('\n3. Verificando se o site está ATIVO:');
    const enabledCheck = await ssh.execCommand('ls -la /etc/nginx/sites-enabled/supabase');
    console.log(enabledCheck.stdout ? '✅ Link simbólico em sites-enabled existe.' : '❌ ERRO: O site não está habilitado no Nginx!');

  } catch (err) {
    console.error('❌ FALHA NO DIAGNÓSTICO:', err.message);
  } finally {
    ssh.dispose();
  }
}

diagnoseSecurity();
