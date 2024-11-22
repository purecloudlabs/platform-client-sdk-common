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

  // Example client request with Axios
  if (enableMTLS) {
    // Axios request with mTLS
    const httpsAgent = new https.Agent({
      key: fs.readFileSync('3_application/private/client.key.pem'),
      cert: fs.readFileSync('3_application/certs/client.cert.pem'),
      ca: fs.readFileSync(clientCaPath),
      rejectUnauthorized: true,
    });

    try {
      const response = await axios.get(`https://${domain}:8443`, { httpsAgent });
      console.log('Server Response:', response.data);
    } catch (err) {
      console.error('Error during mTLS request:', err.message);
    }
  } else {
    // Axios request without mTLS
    try {
      const response = await axios.get(`https://${domain}:8443`);
      console.log('Server Response:', response.data);
    } catch (err) {
      console.error('Error during simple request:', err.message);
    }
  }
})();

