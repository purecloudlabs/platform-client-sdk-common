import http from 'http';
import net from 'net';
import url from 'url';
import fs from 'fs';
import https from 'https';
import pkg from 'http-proxy';
import * as tls from "tls";
const { createProxyServer } = pkg;

export default class GatewayServer {
  public gateway: pkg.httpProxy;
  public server: https.Server;

  constructor() {
    this.gateway = createProxyServer();
    const environment = this.fetchEnvironment();
    const domain = 'localhost';

    // SSL/TLS options for the proxy server
    const serverOptions: https.ServerOptions = {
      key: fs.readFileSync(`./resources/scripts/certs/${domain}.key.pem`),
      cert: fs.readFileSync(`./resources/scripts/certs/${domain}.cert.pem`),
      ca: fs.readFileSync('./resources/scripts/certs/ca-chain.cert.pem'),
      requestCert: true,
      rejectUnauthorized: true, // Verify client certificates
    };

    // HTTPS server to listen for incoming requests
    this.server = https.createServer(serverOptions, (req, res) => {
      // Parse incoming request URL
      const targetHost = url.parse(req.url || '');

      const options: https.RequestOptions = {
        hostname: environment,
        port: 443, // HTTPS port
        path: targetHost.path,
        method: req.method,
        headers: {
          ...req.headers,
          host: environment,
        },
        rejectUnauthorized: false,
      };

      const proxyReq = https.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error('Error during proxy request:', err.message);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway');
      });

      req.pipe(proxyReq);


    });

    // Handle CONNECT method for tunneling
    this.server.on('connect', this.handleConnectRequest.bind(this));
  }

  private fetchEnvironment():string{
    return "api."+process.env.PURECLOUD_ENVIRONMENT
  }

  private handleConnectRequest(req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer) {
    const targetUrl = url.parse(`//${req.url}`, false, true);
    const environment = this.fetchEnvironment();
      const serverSocket = tls.connect(
          {
            host: environment,
            port: 443,
            rejectUnauthorized: false
          }, () => {
            console.log("connection extablishes")
            clientSocket.write(
                'HTTP/1.1 200 Connection Established\r\n' +
                'Proxy-agent: Node.js-Proxy\r\n' +
                '\r\n'
            );
            serverSocket.write(head);
            serverSocket.pipe(clientSocket);
            clientSocket.pipe(serverSocket);
          }

      );

    serverSocket.on('error', (err) => {
      console.error('error with server socket:', err.message)
      clientSocket.end();
    } );
  }
}

const gatewayServer = new GatewayServer();
console.log('HTTPS Gateway server trying to start on port 4027');
gatewayServer.server.listen(4027, () => {
  console.log('HTTPS Gateway server listening on port 4027');
});
