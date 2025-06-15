#!/usr/bin/env node

const KcAdminClient = require('@keycloak/keycloak-admin-client').default;

console.log('🔧 Keycloak Client URLs Update Script');

// Environment variables
const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME;
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD;
const REALM_NAME = process.env.KEYCLOAK_REALM || 'nexus-portal';
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'business-portal';
const FRONTEND_URL = process.env.FRONTEND_URL;

async function updateClientUrls() {
  try {
    if (!KEYCLOAK_URL || !FRONTEND_URL) {
      console.error('❌ KEYCLOAK_URL ve FRONTEND_URL environment variables gerekli!');
      process.exit(1);
    }

    console.log(`📡 Keycloak URL: ${KEYCLOAK_URL}`);
    console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
    console.log(`🏰 Realm: ${REALM_NAME}`);
    console.log(`👥 Client ID: ${CLIENT_ID}`);

    // Keycloak Admin Client
    const kcAdminClient = new KcAdminClient({
      baseUrl: KEYCLOAK_URL,
      realmName: 'master',
    });

    // Authenticate
    await kcAdminClient.auth({
      username: KEYCLOAK_ADMIN_USERNAME,
      password: KEYCLOAK_ADMIN_PASSWORD,
      grantType: 'password',
      clientId: 'admin-cli',
    });
    console.log('✅ Authentication başarılı!');

    // Client'ı bul
    const clients = await kcAdminClient.clients.find({ 
      realm: REALM_NAME,
      clientId: CLIENT_ID 
    });

    if (clients.length === 0) {
      console.error(`❌ Client '${CLIENT_ID}' bulunamadı!`);
      process.exit(1);
    }

    const client = clients[0];
    console.log(`👥 Client bulundu: ${client.clientId} (ID: ${client.id})`);

    // Yeni URL'leri hazırla
    const newRedirectUris = [
      `${FRONTEND_URL}/*`,
      `${FRONTEND_URL}/auth/callback`,
      `${FRONTEND_URL}/assets/silent-check-sso.html`,
      'http://localhost:4200/*', // Development için
    ];

    const newWebOrigins = [
      FRONTEND_URL,
      'http://localhost:4200', // Development için
      '+' // Wildcard
    ];

    // Client'ı güncelle
    console.log('🔄 Client URLs güncelleniyor...');
    await kcAdminClient.clients.update(
      { realm: REALM_NAME, id: client.id },
      {
        redirectUris: newRedirectUris,
        webOrigins: newWebOrigins,
        attributes: {
          ...client.attributes,
          'frontendUrl': FRONTEND_URL
        }
      }
    );

    console.log('✅ Client URLs başarıyla güncellendi!');
    console.log('📋 Yeni Redirect URIs:');
    newRedirectUris.forEach(uri => console.log(`   - ${uri}`));
    console.log('📋 Yeni Web Origins:');
    newWebOrigins.forEach(origin => console.log(`   - ${origin}`));

    console.log(`\n🎉 Keycloak client konfigürasyonu tamamlandı!`);
    console.log(`🔗 Admin Console: ${KEYCLOAK_URL}/admin`);
    console.log(`🔗 Client Settings: ${KEYCLOAK_URL}/admin/master/console/#/${REALM_NAME}/clients/${client.id}/settings`);

  } catch (error) {
    console.error('❌ Client URL update hatası:', error.message);
    if (error.response?.data) {
      console.error('📋 Hata detayı:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

updateClientUrls(); 