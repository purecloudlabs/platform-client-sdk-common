import { exec } from 'child_process';

export default class Proxy {

  public setupProxy(env) {
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
  };

  public stopProxy() {
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
  };

}

const proxy = new Proxy();
const proxyInstsruction: String = process.argv[2];
const env: String = process.argv[3];
if (proxyInstsruction === "start") {
  proxy.setupProxy(env);
}
else {
  proxy.stopProxy();
}

