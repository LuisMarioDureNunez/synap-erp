// SYNAP - Configuracion PM2 para Produccion
// Autor: Luis Mario Taboada Nunez LMTN

module.exports = {
  apps: [
    {
      name: 'synap-backend',
      script: './server/dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '500M',
    },
  ],
};
