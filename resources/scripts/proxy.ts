
import http from 'http';
import net from 'net';
import url from 'url';
import pkg from 'http-proxy';
const { createProxyServer } = pkg;

export default class ProxyServer {

  public proxy: pkg.httpProxy;
  public server: http.Server;

  constructor() {
    this.proxy = createProxyServer();
    this.server = http.createServer((req, res) => {
      const { hostname, port } = url.parse(req.url);
      if (hostname && port) {
        this.proxy.web(req, res, { target: `http://${hostname}:${port}` });
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid request');
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

const proxyServer = new ProxyServer();
console.log('HTTP proxy server trying to start on port 4001');
proxyServer.server.listen(4001, () => {
  console.log('HTTP proxy server listening on port 4001');
});

