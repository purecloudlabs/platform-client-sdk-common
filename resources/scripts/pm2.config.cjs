module.exports = {
  apps: [
    {
      name: 'proxy-server',
      script: './resources/scripts/proxy.ts',
      interpreter: 'node',
      interpreterArgs: '--loader tsx',
    },
  ],
};