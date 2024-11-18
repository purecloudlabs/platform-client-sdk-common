module.exports = {
  apps: [
    {
      name: 'gateway-server',
      script: './resources/scripts/gateway.ts',
      interpreter: 'node',
      interpreterArgs: '--loader tsx',
    }
  ],
};