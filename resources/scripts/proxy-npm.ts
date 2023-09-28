import { exec } from 'child_process';

export default class Proxy {

  public setupProxy() {
    console.log("called pm2")

    exec('./resources/scripts/connect-proxy.sh start_proxy', (error, stdout, stderr) => {
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

if (proxyInstsruction === "start") {
  proxy.setupProxy();
}
else {
  proxy.stopProxy();
}

