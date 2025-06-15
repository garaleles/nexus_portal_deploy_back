#!/usr/bin/env node

const http = require('http');

const healthCheck = http.request({
    host: '0.0.0.0',
    port: process.env.PORT || 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 2000
}, (res) => {
    console.log(`HEALTH CHECK STATUS: ${res.statusCode}`);
    if (res.statusCode == 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

healthCheck.on('error', function (err) {
    console.error('ERROR', err);
    process.exit(1);
});

healthCheck.on('timeout', function () {
    console.error('TIMEOUT');
    healthCheck.destroy();
    process.exit(1);
});

healthCheck.end(); 