module.exports = {
  apps: [
    {
      name: 'proxy-server',
      script: './resources/scripts/gateway.ts',
      interpreter: 'node',
      interpreterArgs: '--loader tsx',
    },
  ],
};