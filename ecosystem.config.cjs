/** PM2 config: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: 'health-link',
      cwd: __dirname,
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
    },
  ],
};
