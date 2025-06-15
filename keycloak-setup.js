#!/usr/bin/env node

const KcAdminClient = require('@keycloak/keycloak-admin-client').default;
const fs = require('fs');
const path = require('path');

console.log('🔑 Keycloak Realm Setup Script Başlatılıyor...');

// Environment variables
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
const REALM_NAME = process.env.KEYCLOAK_REALM || 'nexus-portal';

// Realm configuration file
const REALM_CONFIG_PATH = path.join(__dirname, 'keycloak-realm-config.json');

async function setupKeycloak() {
  try {
    console.log(`📡 Keycloak URL: ${KEYCLOAK_URL}`);
    console.log(`👤 Admin Username: ${KEYCLOAK_ADMIN_USERNAME}`);
    console.log(`🏰 Realm Name: ${REALM_NAME}`);

    // Keycloak Admin Client oluştur
    const kcAdminClient = new KcAdminClient({
      baseUrl: KEYCLOAK_URL,
      realmName: 'master',
    });

    // Admin olarak authenticate ol
    console.log('🔐 Keycloak admin authentication...');
    await kcAdminClient.auth({
      username: KEYCLOAK_ADMIN_USERNAME,
      password: KEYCLOAK_ADMIN_PASSWORD,
      grantType: 'password',
      clientId: 'admin-cli',
    });
    console.log('✅ Authentication başarılı!');

    // Realm config dosyasını oku
    if (!fs.existsSync(REALM_CONFIG_PATH)) {
      console.error(`❌ Realm config dosyası bulunamadı: ${REALM_CONFIG_PATH}`);
      process.exit(1);
    }

    const realmConfig = JSON.parse(fs.readFileSync(REALM_CONFIG_PATH, 'utf8'));
    console.log(`📄 Realm config dosyası yüklendi: ${realmConfig.realm}`);

    // Realm'ı kontrol et
    let existingRealm;
    try {
      existingRealm = await kcAdminClient.realms.findOne({ realm: REALM_NAME });
    } catch (error) {
      console.log(`🔍 Realm '${REALM_NAME}' bulunamadı, yeni oluşturulacak...`);
    }

    if (existingRealm) {
      console.log(`⚠️ Realm '${REALM_NAME}' zaten mevcut!`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('Mevcut realm\'ı güncellemek istiyor musunuz? (y/N): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ İşlem iptal edildi.');
        return;
      }

      // Realm'ı güncelle
      console.log('🔄 Realm güncelleniyor...');
      await kcAdminClient.realms.update({ realm: REALM_NAME }, realmConfig);
      console.log('✅ Realm başarıyla güncellendi!');
    } else {
      // Yeni realm oluştur
      console.log('🆕 Yeni realm oluşturuluyor...');
      await kcAdminClient.realms.create(realmConfig);
      console.log('✅ Realm başarıyla oluşturuldu!');
    }

    // Client'ı kontrol et ve oluştur
    await setupClient(kcAdminClient, realmConfig);

    // Rolleri oluştur
    await setupRoles(kcAdminClient, realmConfig);

    // Kullanıcıları oluştur
    await setupUsers(kcAdminClient, realmConfig);

    console.log('🎉 Keycloak setup tamamlandı!');
    console.log(`🔗 Admin Console: ${KEYCLOAK_URL}/admin`);
    console.log(`🔗 Realm URL: ${KEYCLOAK_URL}/realms/${REALM_NAME}`);

  } catch (error) {
    console.error('❌ Keycloak setup hatası:', error.message);
    if (error.response?.data) {
      console.error('📋 Hata detayı:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

async function setupClient(kcAdminClient, realmConfig) {
  console.log('👥 Client konfigürasyonu kontrol ediliyor...');

  const clients = realmConfig.clients || [];
  
  for (const clientConfig of clients) {
    try {
      // Mevcut client'ı kontrol et
      const existingClients = await kcAdminClient.clients.find({ 
        realm: REALM_NAME,
        clientId: clientConfig.clientId 
      });

      if (existingClients.length > 0) {
        console.log(`📱 Client '${clientConfig.clientId}' zaten mevcut, güncelleniyor...`);
        await kcAdminClient.clients.update({ 
          realm: REALM_NAME, 
          id: existingClients[0].id 
        }, clientConfig);
      } else {
        console.log(`📱 Client '${clientConfig.clientId}' oluşturuluyor...`);
        await kcAdminClient.clients.create({ 
          realm: REALM_NAME, 
          ...clientConfig 
        });
      }
      console.log(`✅ Client '${clientConfig.clientId}' hazır!`);
    } catch (error) {
      console.error(`❌ Client '${clientConfig.clientId}' hatası:`, error.message);
    }
  }
}

async function setupRoles(kcAdminClient, realmConfig) {
  console.log('🎭 Roller kontrol ediliyor...');

  const roles = realmConfig.roles?.realm || [];
  
  for (const roleConfig of roles) {
    try {
      // Mevcut role'u kontrol et
      const existingRoles = await kcAdminClient.roles.find({ realm: REALM_NAME });
      const existingRole = existingRoles.find(r => r.name === roleConfig.name);

      if (existingRole) {
        console.log(`🎭 Role '${roleConfig.name}' zaten mevcut`);
      } else {
        console.log(`🎭 Role '${roleConfig.name}' oluşturuluyor...`);
        await kcAdminClient.roles.create({ 
          realm: REALM_NAME, 
          ...roleConfig 
        });
        console.log(`✅ Role '${roleConfig.name}' oluşturuldu!`);
      }
    } catch (error) {
      console.error(`❌ Role '${roleConfig.name}' hatası:`, error.message);
    }
  }
}

async function setupUsers(kcAdminClient, realmConfig) {
  console.log('👤 Kullanıcılar kontrol ediliyor...');

  const users = realmConfig.users || [];
  
  for (const userConfig of users) {
    try {
      // Mevcut kullanıcıyı kontrol et
      const existingUsers = await kcAdminClient.users.find({ 
        realm: REALM_NAME,
        username: userConfig.username 
      });

      if (existingUsers.length > 0) {
        console.log(`👤 Kullanıcı '${userConfig.username}' zaten mevcut`);
      } else {
        console.log(`👤 Kullanıcı '${userConfig.username}' oluşturuluyor...`);
        
        // Kullanıcıyı oluştur
        const newUser = await kcAdminClient.users.create({ 
          realm: REALM_NAME, 
          ...userConfig 
        });

        // Şifre set et
        if (userConfig.credentials && userConfig.credentials.length > 0) {
          await kcAdminClient.users.resetPassword({
            realm: REALM_NAME,
            id: newUser.id,
            credential: {
              type: 'password',
              value: userConfig.credentials[0].value,
              temporary: userConfig.credentials[0].temporary || false
            }
          });
        }

        // Rolleri ata
        if (userConfig.realmRoles && userConfig.realmRoles.length > 0) {
          const allRoles = await kcAdminClient.roles.find({ realm: REALM_NAME });
          const rolesToAssign = userConfig.realmRoles.map(roleName => {
            const role = allRoles.find(r => r.name === roleName);
            return { id: role.id, name: role.name };
          }).filter(r => r.id);

          if (rolesToAssign.length > 0) {
            await kcAdminClient.users.addRealmRoleMappings({
              realm: REALM_NAME,
              id: newUser.id,
              roles: rolesToAssign
            });
          }
        }

        console.log(`✅ Kullanıcı '${userConfig.username}' oluşturuldu!`);
      }
    } catch (error) {
      console.error(`❌ Kullanıcı '${userConfig.username}' hatası:`, error.message);
    }
  }
}

// Script'i çalıştır
setupKeycloak(); 