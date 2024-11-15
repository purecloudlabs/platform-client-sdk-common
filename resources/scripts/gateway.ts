
import http from 'http';
import net from 'net';
import url from 'url';
import fs from 'fs';
import pkg from 'http-proxy';
import https from "https";
import * as tls from "tls";
const { createProxyServer } = pkg;

export default class GatewayServer {

  public gateway: pkg.httpProxy;
  public server: http.Server;

  constructor() {
    this.gateway = createProxyServer();

    const options = {
      key: fs.readFileSync('certs/server.key'),
      cert :fs.readFileSync('certs/server.crt'),
      ca: fs.readFileSync('certs/ca.pem'),
      requestCert: true,
      rejectUnauthorized: true
    }

    this.server = https.createServer(options,(req, res) => {
      const { hostname, port } = url.parse(req.url);
      const socket = req.socket;
      if (socket instanceof tls.TLSSocket)
        if (socket.authorized) {
          if (hostname && port) {
            this.gateway.web(req, res, { target: `http://${hostname}:${port}` });
          } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid request');
          }
        } else {
          const clientCert = socket.getPeerCertificate();
          if (clientCert && clientCert.subject) {
            res.writeHead(403);
            res.end(`Unauthorized: Certificate from ${clientCert.subject.CN} is not authorized.\n`);
          } else {
            res.writeHead(401);
            res.end('Unauthorized: No valid client certificate provided\n');
          }
        }
    });

    this.server.on('connect', this.handleConnectRequest.bind(this));
  }



  private handleConnectRequest(req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer) {
    const { port, hostname } = url.parse(`//${req.url}`, false, true);
    if (hostname && port) {
      const serverSocket = net.connect(parseInt(port, 10), hostname, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
          'Proxy-agent: Node.js-Proxy\r\n' +
          '\r\n');
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });
    } else {
      clientSocket.write('HTTP/1.1 400 Bad Request\r\n' +
        'Content-Type: text/plain\r\n' +
        '\r\n' +
        'Invalid request');
      clientSocket.end();
    }
  }

}

const gatewayServer = new GatewayServer();
console.log('HTTP gateway server trying to start on port 4002');
gatewayServer.server.listen(4002, () => {
  console.log('HTTP gateway server listening on port 4002');
});

