import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function forceFixVps() {
  try {
    await ssh.connect({
       host: '95.111.250.154',
       username: 'root',
       password: process.env.VPS_ROOT_PASSWORD
    });
    console.log('âœ… Conectado na VPS');

    const res = await ssh.execCommand('cat /root/supabase/docker/docker-compose.yml');
    let compose = res.stdout;

    // 1. Inserir mapeamento de volume e variÃ¡veis de ambiente na seÃ§Ã£o functions
    if (compose.includes('functions:') && !compose.includes('/etc/google-key.json')) {
        console.log('ðŸ“ Modificando docker-compose.yml...');
        
        // Localizar inÃ­cio da seÃ§Ã£o environment dentro de functions
        const fStart = compose.indexOf('functions:');
        
        // Inserir Volume
        const vStart = compose.indexOf('volumes:', fStart);
        const nlV = compose.indexOf('\n', vStart) + 1;
        compose = compose.slice(0, nlV) + '      - ./volumes/functions/google-key.json:/etc/google-key.json:ro\n' + compose.slice(nlV);

        // Inserir VariÃ¡veis
        const eStart = compose.indexOf('environment:', fStart);
        const nlE = compose.indexOf('\n', eStart) + 1;
        // Usar escape para o caracter $ no template JS
        const vars = '      GOOGLE_SERVICE_ACCOUNT_JSON: ${GOOGLE_SERVICE_ACCOUNT_JSON}\n      DATABASE_URL: ${DATABASE_URL}\n';
        compose = compose.slice(0, nlE) + vars + compose.slice(nlE);

        // Gravar via Base64 para total fidelidade
        const b64 = Buffer.from(compose).toString('base64');
        await ssh.execCommand(`echo "${b64}" | base64 -d > /root/supabase/docker/docker-compose.yml`);
        console.log('âœ… docker-compose.yml atualizado com sucesso!');
    } else {
        console.log('â„¹ï¸ As modificaÃ§Ãµes jÃ¡ parecem estar presentes ou a seÃ§Ã£o functions nÃ£o foi encontrada.');
    }

    // 2. Reiniciar containers
    console.log('ðŸ”„ Reiniciando containers...');
    await ssh.execCommand('cd /root/supabase/docker && docker compose up -d --force-recreate functions');
    console.log('âœ¨ OperaÃ§Ã£o concluÃ­da!');

  } catch (err: any) {
    console.error('âŒ Erro no reparo:', err.message);
  } finally {
    ssh.dispose();
  }
}

forceFixVps();

