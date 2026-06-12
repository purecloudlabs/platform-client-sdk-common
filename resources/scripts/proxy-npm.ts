import { exec } from 'child_process';
import { log } from '../../modules/log/logger';

export class Proxy {
  public setupProxy(env: string): void {
    log.info("called pm2")
    exec('./resources/scripts/connect-proxy.sh start_proxy'+' '+ env, (error, stdout, stderr) => {
      if (error) {
        log.error(`Error Starting Proxy: ${error.message}`);
        return;
      }
      if (stderr) {
        log.error(`Error: ${stderr}`);
        return;
      }
      log.debug(stdout)
    });
  }

  public stopProxy(): void {
    exec('./resources/scripts/connect-proxy.sh stop_proxy', (error, stdout, stderr) => {
      if (error) {
        log.error(`Error stopping Proxy: ${error.message}`);
        return;
      }
      if (stderr) {
        log.error(`Error: ${stderr}`);
        return;
      }
    });
  }
}

const proxy = new Proxy();
const proxyInstsruction: String = process.argv[2];
const env: string = process.argv[3];
if (proxyInstsruction === "start") {
  log.info('Starting Proxy');
  proxy.setupProxy(env);
}
else {
  log.info('Stopping Proxy');
  proxy.stopProxy();
}
