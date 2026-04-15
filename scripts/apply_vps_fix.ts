import { NodeSSH } from 'node-ssh';
import * as fs from 'fs';
import * as path from 'path';

const ssh = new NodeSSH();

async function applyFix() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });
    console.log('âœ… Conectado na VPS');

    const localShPath = path.join(process.cwd(), 'scripts', 'fix_vps.sh');
    const content = fs.readFileSync(localShPath, 'utf8');
    const b64Content = Buffer.from(content).toString('base64');
    const remotePath = '/root/fix_vps.sh';

    console.log('ðŸ“¦ Transferindo script de reparo...');
    // Usando aspas simples para evitar expansÃ£o de shell local
    await ssh.execCommand('echo "' + b64Content + '" | base64 -d > ' + remotePath);
    await ssh.execCommand('chmod +x ' + remotePath);

    console.log('ðŸš€ Executando reparo no servidor...');
    const res = await ssh.execCommand(remotePath);
    console.log('RESULTADO NO SERVIDOR:\n', res.stdout || res.stderr);

    ssh.dispose();
    console.log('âœ¨ OperaÃ§Ã£o finalizada.');

  } catch (err: any) {
    console.error('âŒ Erro:', err.message);
  }
}

applyFix();

