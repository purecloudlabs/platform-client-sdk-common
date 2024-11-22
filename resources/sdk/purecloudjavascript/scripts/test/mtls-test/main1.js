const https = require('https');
const fs = require('fs');
const axios = require('axios');

// Variables (equivalent to Go's flags)
const domain = process.argv[2] || 'localhost'; // Provide the domain as a command-line argument
const enableMTLS = process.argv.includes('--mtls'); // Check for the --mtls flag

// Path to certificates
const certPath = `3_application/certs/${domain}.cert.pem`;
const keyPath = `3_application/private/${domain}.key.pem`;
const clientCaPath = '2_intermediate/certs/ca-chain.cert.pem';

(async function startServer() {
  // HTTPS options
  const serverOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  // If mTLS is enabled
  if (enableMTLS) {
    serverOptions.requestCert = true;
    serverOptions.rejectUnauthorized = true;

    // Load CA chain
    serverOptions.ca = fs.readFileSync(clientCaPath);
  }

  // Create an HTTPS server
  const server = https.createServer(serverOptions, (req, res) => {
    console.log('Incoming request:', req.method, req.url);

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World');
  });

  // Start listening on port 8443
  server.listen(8443, () => {
    console.log(`HTTPS server is running on https://${domain}:8443`);
  });
