import http from 'http';
import net from 'net';
import url from 'url';
import pkg from 'http-proxy';
import Logger from '../../modules/log/logger';
const { createProxyServer } = pkg;

const logger = new Logger();

export default class ProxyServer {

  public proxy: pkg.httpProxy;
  public server: http.Server;

  constructor() {
    logger.info('Initializing proxy server...');
    this.proxy = createProxyServer();
    
    // Log proxy errors
    this.proxy.on('error', (err, req, res) => {
      logger.error(`Proxy error: ${err.message}`);
      logger.debug(`Proxy error details: ${err.stack}`);
      logger.debug(`Failed request URL: ${req.url}`);
      logger.debug(`Failed request headers: ${JSON.stringify(req.headers, null, 2)}`);
      if (res instanceof http.ServerResponse) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy error occurred');
      }
    });

    this.server = http.createServer((req, res) => {
      const { hostname, port } = url.parse(req.url);
      logger.debug(`Incoming request for ${req.url}`);
      logger.debug(`Request method: ${req.method}`);
      logger.debug(`Request headers: ${JSON.stringify(req.headers, null, 2)}`);
      
      if (hostname && port) {
        const target = `http://${hostname}:${port}`;
        logger.info(`Proxying request to ${target}`);
        logger.debug(`Target details - Hostname: ${hostname}, Port: ${port}`);
        this.proxy.web(req, res, { target });
      } else {
        logger.warn(`Invalid request received: ${req.url}`);
        logger.debug(`Parse result - Hostname: ${hostname}, Port: ${port}`);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid request');
      }
    });

    this.server.on('connect', this.handleConnectRequest.bind(this));
    logger.info('Proxy server initialized successfully');
  }

  private handleConnectRequest(req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer) {
    const { port, hostname } = url.parse(`//${req.url}`, false, true);
    logger.debug(`CONNECT request received for ${req.url}`);
    logger.debug(`CONNECT request headers: ${JSON.stringify(req.headers, null, 2)}`);

    if (hostname && port) {
      logger.info(`Establishing tunnel to ${hostname}:${port}`);
      logger.debug(`Attempting connection with parameters - Hostname: ${hostname}, Port: ${port}`);
      const serverSocket = net.connect(parseInt(port, 10), hostname, () => {
        logger.debug(`Tunnel established to ${hostname}:${port}`);
        logger.debug(`Local address: ${serverSocket.localAddress}:${serverSocket.localPort}`);
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
          'Proxy-agent: Node.js-Proxy\r\n' +
          '\r\n');
        serverSocket.write(head);
        
        // Setup bidirectional tunnel
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
        logger.debug('Bidirectional tunnel established successfully');
        
        // Log socket events
        serverSocket.on('error', (err) => {
          logger.error(`Server socket error: ${err.message}`);
          logger.debug(`Server socket error details: ${err.stack}`);
        });
        
        clientSocket.on('error', (err) => {
          logger.error(`Client socket error: ${err.message}`);
          logger.debug(`Client socket error details: ${err.stack}`);
        });
      });

      serverSocket.on('error', (err) => {
        logger.error(`Failed to establish tunnel to ${hostname}:${port}: ${err.message}`);
        clientSocket.write('HTTP/1.1 500 Internal Server Error\r\n' +
          'Content-Type: text/plain\r\n' +
          '\r\n' +
          'Failed to establish connection');
        clientSocket.end();
      });
    } else {
      logger.warn(`Invalid CONNECT request received: ${req.url}`);
      clientSocket.write('HTTP/1.1 400 Bad Request\r\n' +
        'Content-Type: text/plain\r\n' +
        '\r\n' +
        'Invalid request');
      clientSocket.end();
    }
  }
}

const proxyServer = new ProxyServer();
logger.info('HTTP proxy server trying to start on port 4001');
proxyServer.server.listen(4001, () => {
  logger.info('HTTP proxy server listening on port 4001');
});
