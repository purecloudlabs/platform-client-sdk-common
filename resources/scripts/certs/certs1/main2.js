import https from "https";
import * as fs from "fs";
// Server options
const domain = process.argv[2] || 'localhost';
const enableMTLS = process.argv.includes('--mtls');

const serverOptions = {
  key: fs.readFileSync(`3_application/private/${domain}.key.pem`),
  cert: fs.readFileSync(`3_application/certs/${domain}.cert.pem`),
};

if (enableMTLS) {
  const caCert = fs.readFileSync('2_intermediate/certs/ca-chain.cert.pem');

  serverOptions.ca = caCert;
  serverOptions.requestCert = true;
  serverOptions.rejectUnauthorized = true;
}

const server = https.createServer(serverOptions, (req, res) => {
  console.log("reached")
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello');
});

server.listen(8444, () => {
  console.log(`Server is running on https://${domain}:8443`);
  console.log(enableMTLS ? 'Mutual TLS is enabled.' : 'Mutual TLS is not enabled.');
});

