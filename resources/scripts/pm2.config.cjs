module.exports = {
  apps: [
    {
      name: 'gateway-server',
      script: './resources/scripts/gateway.ts',
      interpreter: 'node',
      interpreterArgs: '--import tsx',
    },
    {
      name: 'proxy-server',
      script: './resources/scripts/proxy.ts',
      interpreter: 'node',
      interpreterArgs: '--import tsx',
    }
  ],
};