#!/usr/bin/env node

const http = require('http');

const port = process.env.PORT || 3000;
const host = '0.0.0.0';

console.log(`🏥 Health check başlatılıyor...`);
console.log(`🔍 Kontrol edilen endpoint: http://${host}:${port}/api/health`);

const options = {
    hostname: 'localhost',
    port: port,
    path: '/api/health',
    method: 'GET',
    timeout: 10000,
    headers: {
        'User-Agent': 'Railway-HealthCheck/1.0'
    }
};

const req = http.request(options, (res) => {
    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`📄 Response:`, data);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ Health check başarılı!');
            process.exit(0);
        } else {
            console.log(`❌ Health check başarısız! Status: ${res.statusCode}`);
            process.exit(1);
        }
    });
});

req.on('error', (err) => {
    console.error(`❌ Health check hatası:`, err.message);
    console.error(`🔧 Muhtemel çözümler:`);
    console.error(`   - Uygulamanın başlatıldığından emin olun`);
    console.error(`   - Port ${port} doğru mu kontrol edin`);
    console.error(`   - /api/health endpoint'i erişilebilir mi kontrol edin`);
    process.exit(1);
});

req.on('timeout', () => {
    console.error(`⏰ Health check timeout! (10 saniye)`);
    req.destroy();
    process.exit(1);
});

req.end(); 