import { NodeSSH } from "node-ssh";
import path from "path";

const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '95.111.250.154',
      username: 'root',
      password: process.env.VPS_ROOT_PASSWORD
    });
    console.log("âœ… SSH Conectado!");

    const res1 = await ssh.execCommand("ls -la /var/www/html/dist");
    console.log("FILES IN /var/www/html/dist:\n", res1.stdout);

    const res2 = await ssh.execCommand("ls -la /var/www/html");
    console.log("\nDIRECTORIES IN /var/www/html:\n", res2.stdout);

    const res3 = await ssh.execCommand("cat /etc/nginx/sites-enabled/default");
    console.log("\nNGINX DEFAULT CONFIG:\n", res3.stdout);

    const res4 = await ssh.execCommand("docker ps");
    console.log("\nDOCKER PS:\n", res4.stdout);

    const res5 = await ssh.execCommand("ps aux | grep nginx");
    console.log("\nNGINX PROCESSES:\n", res5.stdout);

    ssh.dispose();
  } catch (err: any) {
    console.error("ERRO:", err.message);
  }
}

run();

