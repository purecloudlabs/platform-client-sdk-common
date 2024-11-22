const axios = require('axios');
const fs = require('fs');

(async () => {
  try {
    // Load certificates and private key
    const caCert = fs.readFileSync('2_intermediate/certs/ca-chain.cert.pem');
    const clientCert = fs.readFileSync('4_client/certs/localhost.cert.pem');
    const clientKey = fs.readFileSync('4_client/private/localhost.key.pem');

    // Create an HTTPS agent with mutual TLS configuration
    const httpsAgent = new require('https').Agent({
      ca: caCert,
      cert: clientCert,
      key: clientKey,
      rejectUnauthorized: true, // Ensure server certificate validation
    });

    // Make the request
    const response = await axios.get('https://localhost:8443/', {
      httpsAgent,
    });

    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();

