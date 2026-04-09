module.exports = {
    apps: [
        {
            name: 'posts-explorer-api',
            script: 'server.js',
            instances: 'max',
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            max_memory_restart: '700M',
            kill_timeout: 10000,
            listen_timeout: 10000,
            env: {
                NODE_ENV: 'production',
                PORT: 5000
            }
        }
    ]
};
