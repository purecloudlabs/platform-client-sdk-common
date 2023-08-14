const http = require('http');
const net = require('net');
const url = require('url');
const { createProxyServer } = require('http-proxy');

const proxy = createProxyServer();

const server = http.createServer((req, res) => {
  const { hostname, port } = url.parse(req.url);
  if (hostname && port) {
    proxy.web(req, res, { target: `http://${hostname}:${port}` });
  } else {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid request');
  }
});

server.on('connect', (req, clientSocket, head) => {
  const { port, hostname } = url.parse(`//${req.url}`, false, true);
  if (hostname && port) {
    const serverSocket = net.connect(port, hostname, () => {
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
});

server.listen(4001, () => {
  console.log('HTTP proxy server listening on port 4001');
});

