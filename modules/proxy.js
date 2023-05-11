// const fs = require('fs');
// const path = require('path');
const { exec } = require('child_process');

// function setupNginx(nginxPort, jenkinsPort) {
//   const nginxConfig = `
//     server {
//         listen ${nginxPort} default_server;
//         server_name _;

//         location / {
//             proxy_pass http://localhost:${jenkinsPort};
//             proxy_set_header Host $host;
//             proxy_set_header X-Real-IP $remote_addr;
//             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
//         }
//     }
//   `;
  
//   const nginxConfigFile = '/etc/nginx/sites-available/default';
//   fs.writeFileSync(nginxConfigFile, nginxConfig);
//   fs.symlinkSync(nginxConfigFile, '/etc/nginx/sites-enabled/default', 'file');
  
//   exec('sudo service nginx restart', (error, stdout, stderr) => {
//     if (error) {
//       console.error(`exec error: ${error}`);
//       return;
//     }
//     console.log(`stdout: ${stdout}`);
//     console.error(`stderr: ${stderr}`);
//   });
// }

// const { exec } = require('child_process');

function Proxy() {}

Proxy.prototype.setupNginx =  function setupNginx() {
  // Install Nginx using the installNginx.sh script
  exec('./modules/installNginx.sh', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error installing Nginx: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    
    // Configure Nginx proxy as needed using the Nginx configuration file
    // ...
  });
};

Proxy.prototype.setupNginx =  function stopServer() {
    // Install Nginx using the installNginx.sh script
    exec('./modules/stopProxy.sh', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing Nginx: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      
      // Configure Nginx proxy as needed using the Nginx configuration file
      // ...
    });
  };


function setupNginx1() {
    // Install Nginx using the installNginx.sh script
    exec('./modules/installNginx.sh', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing Nginx: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      
      // Configure Nginx proxy as needed using the Nginx configuration file
      // ...
    });
  };

// const http = require('http');
// const httpProxy = require('http-proxy');

// // Create a new HTTP proxy server
// const proxy = httpProxy.createProxyServer({});

// // Create a new HTTP server
// const server = http.createServer((req, res) => {
//   // Proxy all requests to http://example.com
//   proxy.web(req, res, { target: 'http://example.com' });
// });

// // Start the HTTP server on port 8080
// server.listen(8800, () => {
//   console.log('Proxy server is running on port 8080');
// });

// module.exports = { setupNginx };

// module.exports = setupNginx;

setupNginx1();