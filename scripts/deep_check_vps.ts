import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function deepCheck() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado!');
    
    // Check if the old JS file exists
    const findOld = await ssh.execCommand('find /var/www/html/dist -name "HybridSchedule-CtR_fADd.js"');
    console.log('Arquivo antigo encontrado?', findOld.stdout || 'NÃ£o');

    // Check what Nginx is actually serving
    const nginx = await ssh.execCommand('cat /etc/nginx/sites-available/supabase');
    console.log('Config Nginx:', nginx.stdout);

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

deepCheck();

