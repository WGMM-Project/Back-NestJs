module.exports = {
  apps: [
    {
      name: 'Prunidor-Back-NestJS',
      script: './dist/main.js',
      instances: process.env.INSTANCE_COUNT || 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
