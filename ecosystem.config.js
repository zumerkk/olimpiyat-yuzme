// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         PM2 Configuration
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  apps: [
    {
      // Backend Application
      name: 'olimpiyat-backend',
      script: './backend/server.js',
      cwd: __dirname,
      instances: 'max',
      exec_mode: 'cluster',
      
      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      
      // Restart policy
      max_memory_restart: '500M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Watch (development only)
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Health monitoring
      exp_backoff_restart_delay: 100,
      
      // Graceful shutdown
      kill_timeout: 30000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/olimpiyat.git',
      path: '/var/www/olimpiyat',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && cd backend && npm install && cd ../frontend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
