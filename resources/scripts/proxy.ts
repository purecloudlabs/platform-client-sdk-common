import http from 'http';
import net from 'net';
import url from 'url';
import pkg from 'http-proxy';
import log from '../../modules/log/logger';
const { createProxyServer } = pkg;

export default class ProxyServer {

  public proxy: pkg.httpProxy;
  public server: http.Server;

  constructor() {
    log.info('Initializing proxy server...');
    this.proxy = createProxyServer();
    
    // Log proxy errors
    this.proxy.on('error', (err, req, res) => {
      log.error(`Proxy error: ${err.message}`);
      log.debug(`Proxy error details: ${err.stack}`);
      log.debug(`Failed request URL: ${req.url}`);
      log.debug(`Failed request headers: ${JSON.stringify(req.headers, null, 2)}`);
      if (res instanceof http.ServerResponse) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy error occurred');
      }
    });

    this.server = http.createServer((req, res) => {
      const { hostname, port } = url.parse(req.url);
      log.debug(`Incoming request for ${req.url}`);
      log.debug(`Request method: ${req.method}`);
      log.debug(`Request headers: ${JSON.stringify(req.headers, null, 2)}`);
      
      if (hostname && port) {
        const target = `http://${hostname}:${port}`;
        log.info(`Proxying request to ${target}`);
        log.debug(`Target details - Hostname: ${hostname}, Port: ${port}`);
        this.proxy.web(req, res, { target });
      } else {
        log.warn(`Invalid request received: ${req.url}`);
        log.debug(`Parse result - Hostname: ${hostname}, Port: ${port}`);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid request');
      }
    });

    this.server.on('connect', this.handleConnectRequest.bind(this));
    log.info('Proxy server initialized successfully');
  }

  private handleConnectRequest(req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer) {
    const { port, hostname } = url.parse(`//${req.url}`, false, true);
    log.debug(`CONNECT request received for ${req.url}`);
    log.debug(`CONNECT request headers: ${JSON.stringify(req.headers, null, 2)}`);

    if (hostname && port) {
      log.info(`Establishing tunnel to ${hostname}:${port}`);
      log.debug(`Attempting connection with parameters - Hostname: ${hostname}, Port: ${port}`);
      const serverSocket = net.connect(parseInt(port, 10), hostname, () => {
        log.debug(`Tunnel established to ${hostname}:${port}`);
        log.debug(`Local address: ${serverSocket.localAddress}:${serverSocket.localPort}`);
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
          'Proxy-agent: Node.js-Proxy\r\n' +
          '\r\n');
        serverSocket.write(head);
        
        // Setup bidirectional tunnel
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
        log.debug('Bidirectional tunnel established successfully');
        
        // Log socket events
        serverSocket.on('error', (err) => {
          log.error(`Server socket error: ${err.message}`);
          log.debug(`Server socket error details: ${err.stack}`);
        });
        
        clientSocket.on('error', (err) => {
          log.error(`Client socket error: ${err.message}`);
          log.debug(`Client socket error details: ${err.stack}`);
        });
      });

      serverSocket.on('error', (err) => {
        log.error(`Failed to establish tunnel to ${hostname}:${port}: ${err.message}`);
        clientSocket.write('HTTP/1.1 500 Internal Server Error\r\n' +
          'Content-Type: text/plain\r\n' +
          '\r\n' +
          'Failed to establish connection');
        clientSocket.end();
      });
    } else {
      log.warn(`Invalid CONNECT request received: ${req.url}`);
      clientSocket.write('HTTP/1.1 400 Bad Request\r\n' +
        'Content-Type: text/plain\r\n' +
        '\r\n' +
        'Invalid request');
      clientSocket.end();
    }
  }
}

const proxyServer = new ProxyServer();
log.info('HTTP proxy server trying to start on port 4001');
proxyServer.server.listen(4001, () => {
  log.info('HTTP proxy server listening on port 4001');
});
