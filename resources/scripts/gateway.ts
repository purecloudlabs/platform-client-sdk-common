import http from 'http';
import net from 'net';
import url from 'url';
import fs from 'fs';
import https from 'https';
import pkg from 'http-proxy';
import * as tls from "tls";
const { createProxyServer } = pkg;

// Logger function to standardize logging format
const log = (activity: string, details?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${activity}`, details ? details : '');
};

export default class GatewayServer {
  public gateway: pkg.httpProxy;
  public server: https.Server;
  private environment: string;
  constructor() {
    log('Initializing GatewayServer');
    this.gateway = createProxyServer();
    this.environment = this.fetchEnvironment("login");
    const domain = 'localhost';
    log('Server configuration', { environment: this.environment, domain });

    // SSL/TLS options for the proxy server
    const serverOptions: https.ServerOptions = {
      key: fs.readFileSync(`./resources/scripts/certs/${domain}.key.pem`),
      cert: fs.readFileSync(`./resources/scripts/certs/${domain}.cert.pem`),
      ca: fs.readFileSync('./resources/scripts/certs/ca-chain.cert.pem'),
      requestCert: true,
      rejectUnauthorized: true, // Verify client certificates
    };
    log('SSL/TLS certificates loaded successfully');

    // HTTPS server to listen for incoming requests
    this.server = https.createServer(serverOptions, (req, res) => {
      log('Incoming request received', {
        method: req.method,
        url: req.url,
        headers: req.headers
      });

      let reqURL: string | undefined;
      if (req.url?.includes('/login')) {
          reqURL = req.url.replace(/^\/login/, '')
          this.environment = this.fetchEnvironment("login");
      } else if (req.url?.includes('/api')) {
          reqURL = req.url.replace(/^\/api/, '')
          this.environment = this.fetchEnvironment("api");
      } else {
          reqURL = req.url || ''
      }      
      // Parse incoming request URL
      const targetHost = url.parse(reqURL || '');
      log('Parsed target host', targetHost);

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
      log('Proxy request options prepared', options);

      const proxyReq = https.request(options, (proxyRes) => {
        log('Proxy response received', {
          headers: proxyRes.headers,
          statusCode: proxyRes.statusCode
        });
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
        log('Response piped back to client');
      });
      
      proxyReq.on('error', (err) => {
        log('Proxy request error', {
          error: err.message,
          stack: err.stack
        });
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway');
      });

      req.pipe(proxyReq);
      log('Request piped to proxy');
    });

    // Handle CONNECT method for tunneling
    this.server.on('connect', this.handleConnectRequest.bind(this));
    log('CONNECT handler registered');
  }

  private fetchEnvironment(path: string):string{
    const envUrl = path+"."+process.env.PURECLOUD_ENV;
    log('Environment URL resolved', envUrl);
    return envUrl
  }

  private handleConnectRequest(req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer) {
    log('CONNECT request received', {
      url: req.url,
      method: req.method,
      headers: req.headers
    });

    const targetUrl = url.parse(`//${req.url}`, false, true);
    const environment = this.fetchEnvironment("api");
    log('CONNECT request details', { targetUrl, environment });

    const serverSocket = tls.connect(
      {
        host: environment,
        port: 443,
        rejectUnauthorized: false
      }, () => {
        log('TLS connection established', { host: environment });
        clientSocket.write(
          'HTTP/1.1 200 Connection Established\r\n' +
          'Proxy-agent: Node.js-Proxy\r\n' +
          '\r\n'
        );
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
        log('Bidirectional pipe established');
      }
    );

    serverSocket.on('error', (err) => {
      log('Server socket error', { 
        message: err.message, 
        environment: environment,
        stack: err.stack
      });
      clientSocket.end();
    });
  }
}

const gatewayServer = new GatewayServer();
log('Starting HTTPS Gateway server on port 4027');
gatewayServer.server.listen(4027, () => {
  log('HTTPS Gateway server successfully started on port 4027');
});