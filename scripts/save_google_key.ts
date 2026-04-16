import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

const googleJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!googleJson) {
  console.error("ERRO: Variável de ambiente GOOGLE_SERVICE_ACCOUNT_JSON não definida.");
  process.exit(1);
}

async function saveKeyToFile() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });
    console.log('âœ… Conectado na VPS');

    // Salvar o arquivo JSON na pasta de volumes montada pelas funÃ§Ãµes
    const keyPath = '/root/supabase/docker/volumes/functions/google-key.json';
    console.log(`ðŸ“ Salvando chave em: ${keyPath}`);
    
    // Usando base64 para evitar problemas com caracteres especiais no shell
    const base64Key = Buffer.from(googleJson).toString('base64');
    await ssh.execCommand(`echo "${base64Key}" | base64 -d > ${keyPath}`);
    await ssh.execCommand(`chmod 644 ${keyPath}`);

    console.log('âœ¨ Chave salva com sucesso no disco!');

  } catch (err: any) {
    console.error('Erro:', err.message);
  } finally {
    ssh.dispose();
  }
}

saveKeyToFile();

