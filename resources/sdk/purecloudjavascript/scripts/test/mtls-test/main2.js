const https = require('https');
const fs = require('fs');
const path = require('path');

// Server options
const domain = process.argv[2] || 'localhost';
const enableMTLS = process.argv.includes('--mtls');

const serverOptions = {
  key: fs.readFileSync(path.join(__dirname, `3_application/private/${domain}.key.pem`)),
  cert: fs.readFileSync(path.join(__dirname, `3_application/certs/${domain}.cert.pem`)),
};

if (enableMTLS) {
  const caCert = fs.readFileSync(path.join(__dirname, '2_intermediate/certs/ca-chain.cert.pem'));

  serverOptions.ca = caCert;
  serverOptions.requestCert = true;
  serverOptions.rejectUnauthorized = true;
}

const server = https.createServer(serverOptions, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello, Secure World!');
});

server.listen(8443, () => {
  console.log(`Server is running on https://${domain}:8443`);
  console.log(enableMTLS ? 'Mutual TLS is enabled.' : 'Mutual TLS is not enabled.');
});

