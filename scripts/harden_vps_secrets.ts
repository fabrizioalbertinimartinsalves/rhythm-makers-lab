import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function hardenSecrets() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });
    console.log('âœ… Conectado na VPS');

    // 1. Atualizar docker-compose.yml para montar o arquivo em /etc/google-key.json
    console.log('ðŸ“ Mapeando arquivo de chave como volume fixo...');
    const res = await ssh.execCommand('cat /root/supabase/docker/docker-compose.yml');
    let compose = res.stdout;

    const mountLine = '      - ./volumes/functions/google-key.json:/etc/google-key.json:ro';
    if (!compose.includes(mountLine)) {
        // Inserir na seÃ§Ã£o de volumes das functions
        const functionsStart = compose.indexOf('functions:');
        const volumesStart = compose.indexOf('volumes:', functionsStart);
        const insertPos = compose.indexOf('\n', volumesStart) + 1;
        
        compose = compose.slice(0, insertPos) + mountLine + '\n' + compose.slice(insertPos);

        await ssh.execCommand(`echo '${compose.replace(/'/g, "'\\''")}' > /root/supabase/docker/docker-compose.yml`);
    }

    // 2. Reiniciar para aplicar a montagem
    console.log('ðŸ”„ Reiniciando containers...');
    await ssh.execCommand('cd /root/supabase/docker && docker compose up -d --force-recreate functions');

    console.log('âœ¨ Mapeamento de hardware concluÃ­do!');

  } catch (err: any) {
    console.error('Erro:', err.message);
  } finally {
    ssh.dispose();
  }
}

hardenSecrets();

