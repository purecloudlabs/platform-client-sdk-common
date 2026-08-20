import { exec } from 'child_process';

function setupProxy(env: string): void {
  console.log("called pm2")
  exec('./resources/scripts/connect-proxy.sh start_proxy'+' '+ env, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error Starting Proxy: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return;
    }
    console.log(stdout)
  });
}

function stopProxy(): void {
  exec('./resources/scripts/connect-proxy.sh stop_proxy', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error stopping Proxy: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return;
    }
  });
}

const proxyInstsruction: string = process.argv[2];
const env: string = process.argv[3];
if (proxyInstsruction === "start") {
  setupProxy(env);
}
else {
  stopProxy();
}
