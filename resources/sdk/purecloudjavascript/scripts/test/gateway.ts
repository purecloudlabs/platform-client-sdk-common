import http from 'http';
import net from 'net';
import url from 'url';
import fs from 'fs';
import https from 'https';
import pkg from 'http-proxy';
import * as tls from "tls";
const { createProxyServer } = pkg;
import platformClient from '../../../../../output/purecloudjavascript/build'
import assert from "assert";

export default class GatewayServer {
  public gateway: pkg.httpProxy;
  public server: https.Server;

  constructor() {
    this.gateway = createProxyServer();

    const usersApi = new platformClient.UsersApi();
    const domain = 'localhost';
    const PURECLOUD_CLIENT_ID = process.env.PURECLOUD_CLIENT_ID;
    const PURECLOUD_CLIENT_SECRET = process.env.PURECLOUD_CLIENT_SECRET;
    let PURECLOUD_ENVIRONMENT = process.env.PURECLOUD_ENVIRONMENT;
  //  const platformClient = require('../../../../../output/purecloudjavascript/build');

    // SSL/TLS options for the proxy server
    const serverOptions: https.ServerOptions = {
      key: fs.readFileSync(`./resources/scripts/certs/certs1/3_application/private/${domain}.key.pem`),
      cert: fs.readFileSync(`./resources/scripts/certs/certs1/3_application/certs/${domain}.cert.pem`),
      ca: fs.readFileSync('./resources/scripts/certs/certs1/2_intermediate/certs/ca-chain.cert.pem'),
      requestCert: true,
      rejectUnauthorized: true, // Verify client certificates
    };

    // HTTPS server to listen for incoming requests
    this.server = https.createServer(serverOptions, (req, res) => {
      // Parse incoming request URL
      const targetHost = url.parse(req.url || '');
      console.log(req)
      console.log(`https://api.mypurecloud.com`+targetHost.path)
      const httpsAgent = new https.Agent({
        rejectUnauthorized : false,
        requestCert: false
      })
      const client = platformClient.ApiClient.instance;
      client.setEnvironment(PURECLOUD_ENVIRONMENT);
      client
          .loginClientCredentialsGrant(PURECLOUD_CLIENT_ID, PURECLOUD_CLIENT_SECRET)



      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Hello World');




      // const options: https.RequestOptions = {
      //   hostname: `api.mypurecloud.com`,
      //   port: 443, // HTTPS port
      //   path: targetHost.path,
      //   method: req.method,
      //   headers: {
      //     ...req.headers, // Forward all headers from the original request
      //     host: `api.mypurecloud.com`, // Override the `host` header
      //   },
      //   rejectUnauthorized: false, // Disable SSL certificate validation for the target
      // };
      //
      // console.log(options)
      //
      // const proxyReq = https.request(options, (proxyRes) => {
      //
      //   console.log(res)
      //   // Forward the status and headers from the target response
      //   res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      //
      //   // Pipe the target response back to the client
      //   proxyRes.pipe(res);
      // });

      // proxyReq.on('error', (err) => {
      //   console.error('Error during proxy request:', err.message);
      //   res.writeHead(502, { 'Content-Type': 'text/plain' });
      //   res.end('Bad Gateway');
      // });

      // Pipe the original client request to the target server
      //req.pipe(proxyReq);


    });

    // Handle CONNECT method for tunneling
    this.server.on('connect', this.handleConnectRequest.bind(this));
  }

  private handleConnectRequest(req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer) {
    const targetUrl = url.parse(`//${req.url}`, false, true);
    console.log(targetUrl)

    //target: `https://api.mypurecloud.com`+targetUrl.path,
      const serverSocket = tls.connect(
          {
            host: 'api.mypurecloud.com',
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

      // Establish a connection to the target host
      // const serverSocket = net.connect(parseInt("443", 10), `https://api.mypurecloud.com`, () => {
      //   console.log("connection extablishes")
      //   clientSocket.write(
      //       'HTTP/1.1 200 Connection Established\r\n' +
      //       'Proxy-agent: Node.js-Proxy\r\n' +
      //       '\r\n'
      //   );
      //   serverSocket.write(head);
      //   serverSocket.pipe(clientSocket);
      //   clientSocket.pipe(serverSocket);
      // });

  }
}

const gatewayServer = new GatewayServer();
console.log('HTTPS Gateway server trying to start on port 4006');
gatewayServer.server.listen(4021, () => {
  console.log('HTTPS Gateway server listening on port 4006');
});
