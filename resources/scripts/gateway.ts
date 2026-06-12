import http from 'http';
import net from 'net';
import url from 'url';
import fs from 'fs';
import https from 'https';
import httpProxy from 'http-proxy';
import * as tls from "tls";
import { log } from '../../modules/log/logger';

export class GatewayServer {
  public gateway: httpProxy<http.IncomingMessage, http.ServerResponse<http.IncomingMessage>>;
  public server: https.Server;
  private environment: string;

  constructor() {
    log.info('Initializing GatewayServer');
    this.gateway = httpProxy.createProxyServer();

    this.environment = this.fetchEnvironment("login");
    const domain = 'localhost';
    log.debug(`Server configuration: { environment: ${this.environment}, domain: ${domain} }`);

    // SSL/TLS options for the proxy server
    const serverOptions: https.ServerOptions = {
      key: fs.readFileSync(`./resources/scripts/certs/${domain}.key.pem`),
      cert: fs.readFileSync(`./resources/scripts/certs/${domain}.cert.pem`),
      ca: fs.readFileSync('./resources/scripts/certs/ca-chain.cert.pem'),
      requestCert: true,
      rejectUnauthorized: true, // Verify client certificates
    };
    log.info('SSL/TLS certificates loaded successfully');

    // HTTPS server to listen for incoming requests
    this.server = https.createServer(serverOptions, (req, res) => {
      log.debug(`Incoming request received: ${JSON.stringify({
        method: req.method,
        url: req.url,
        headers: req.headers
      }, null, 2)}`);

      let reqURL: string | undefined;
      if (req.url?.includes('/login') || req.url?.includes('/oauth/token')) {
        reqURL = req.url.replace(/^\/login/, '')
        this.environment = this.fetchEnvironment("login");
      } else if (req.url?.includes('/api')) {
        // Handle API requests - replace '/api/api' with '/api' if it exists
        reqURL = req.url?.includes('/api/api') ? req.url.replace('/api/api', '/api') : req.url;
        this.environment = this.fetchEnvironment("api");
      } else {
        reqURL = req.url || ''
      }

      // Parse incoming request URL
      const targetHost = url.parse(reqURL || '', false, true);
      log.debug(`Parsed target host: ${targetHost}`);

      const options: https.RequestOptions = {
        hostname: this.environment,
        port: 443, // HTTPS port
        path: targetHost.path,
        method: req.method,
        headers: {
          ...req.headers,
          host: this.environment,
        },
        rejectUnauthorized: false,
      };
      log.debug(`Proxy request options prepared: ${options}`);

      const proxyReq = https.request(options, (proxyRes) => {
        log.debug(`Proxy response received: ${JSON.stringify({
          headers: proxyRes.headers,
          statusCode: proxyRes.statusCode
        }, null, 2)}`);
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
        log.debug('Response piped back to client');
      });

      proxyReq.on('error', (err) => {
        log.error(`Proxy request error: ${JSON.stringify({
          error: err.message,
          stack: err.stack
        }, null, 2)}`);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway');
      });

      req.pipe(proxyReq);
      log.debug('Request piped to proxy');
    });

    // Handle CONNECT method for tunneling
    this.server.on('connect', this.handleConnectRequest.bind(this));
    log.debug('CONNECT handler registered');
  }

  private fetchEnvironment(path: string): string {
    const envUrl = path + "." + process.env.PURECLOUD_ENV;
    log.debug(`Environment URL resolved: ${envUrl}`);
    return envUrl
  }

  private handleConnectRequest(req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer) {
    log.debug(`CONNECT request received: ${JSON.stringify({
      url: req.url,
      method: req.method,
      headers: req.headers
    }, null, 2)}`);

    const targetUrl = url.parse(`//${req.url}`, false, true);
    const environment = this.fetchEnvironment("api");
    log.debug(`CONNECT request details: { targetUrl: ${targetUrl}, environment: ${environment} }`);

    const serverSocket = tls.connect(
      {
        host: environment,
        port: 443,
        rejectUnauthorized: false
      }, () => {
        log.debug(`TLS connection established: { host: ${environment} }`);
        clientSocket.write(
          'HTTP/1.1 200 Connection Established\r\n' +
          'Proxy-agent: Node.js-Proxy\r\n' +
          '\r\n'
        );
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
        log.debug('Bidirectional pipe established');
      }
    );

    serverSocket.on('error', (err) => {
      log.error(`Server socket error: ${JSON.stringify({
        message: err.message,
        environment: environment,
        stack: err.stack
      }, null, 2)}`);
      clientSocket.end();
    });
  }
}

const gatewayServer = new GatewayServer();
log.info('Starting HTTPS Gateway server on port 4027');
gatewayServer.server.listen(4027, () => {
  log.info('HTTPS Gateway server successfully started on port 4027');
});
