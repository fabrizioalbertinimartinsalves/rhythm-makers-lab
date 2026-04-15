import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: '95.111.250.154',
    username: 'root',
    password: process.env.VPS_ROOT_PASSWORD
  });
  const res = await ssh.execCommand('docker ps --format "{{.Names}}"');
  console.log(res.stdout);
  ssh.dispose();
}

run().catch(console.error);

