import { NodeSSH } from 'node-ssh';
import path from 'path';

const ssh = new NodeSSH();

async function runPython() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });

    console.log('âœ… SSH Conectado! Enviando gerador Python...');
    const localPy = path.join(process.cwd(), 'scripts', 'gen.py');
    await ssh.putFile(localPy, '/root/gen.py');

    console.log('âœ… Rodando gerador na VPS para processar as exclamaÃ§Ãµes na senha...');
    // We pass the password to python as an argument
    const py = await ssh.execCommand('python3 /root/gen.py "Fama1977!@!@Dani1979!@!@"');
    
    const output = py.stdout.trim();
    console.log('Resultado do gerador:', output);

    if (output.includes('fabriziomartins:')) {
      console.log('âœ… Salvando hash limpo no NGINX...');
      // Safe write without bang expansion
      await ssh.execCommand(`echo -n '${output}' > /etc/nginx/.htpasswd`);
      
      console.log('âœ… Dando Restart no NGINX...');
      await ssh.execCommand('systemctl restart nginx');
      console.log('ðŸŽ‰ Tudo Perfeito! Tente a senha agora no seu navegador.');
    } else {
      console.error('Falha no Python:', py.stderr);
    }

  } catch (err: any) {
    console.error('Falha:', err.message);
  } finally {
    ssh.dispose();
  }
}

runPython();

