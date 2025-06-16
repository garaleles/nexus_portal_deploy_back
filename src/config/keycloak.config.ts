import { registerAs } from '@nestjs/config';


export default registerAs('keycloak', () => {
  const keycloakUrl = process.env.KEYCLOAK_URL;
  const keycloakPublicUrl = process.env.KEYCLOAK_PUBLIC_URL;
  console.log('Keycloak URL (config): ', keycloakUrl);
  console.log('Keycloak Public URL (config): ', keycloakPublicUrl);
  const keycloakRedirectUri = process.env.KEYCLOAK_REDIRECT_URI;
  console.log('Keycloak Redirect URI (config): ', keycloakRedirectUri);

  // Frontend için public URL kullan, backend için internal URL
  const frontendKeycloakUrl = keycloakPublicUrl || keycloakUrl;

  return {
    realm: process.env.KEYCLOAK_REALM,
    url: keycloakUrl, // Backend için internal URL
    publicUrl: keycloakPublicUrl, // Frontend için public URL
    frontendUrl: frontendKeycloakUrl, // Frontend'in erişeceği URL
    clientId: process.env.KEYCLOAK_CLIENT_ID,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    publicClient: false,
    confidentialPort: 0,
    adminUrl: `${keycloakUrl}/admin/realms/${process.env.KEYCLOAK_REALM || 'nexus-portal'}`,
    tokenUrl: `${keycloakUrl}/realms/${process.env.KEYCLOAK_REALM || 'nexus-portal'}/protocol/openid-connect/token`,
    authUrl: `${frontendKeycloakUrl}/realms/${process.env.KEYCLOAK_REALM || 'nexus-portal'}/protocol/openid-connect/auth`,
    logoutUrl: `${frontendKeycloakUrl}/realms/${process.env.KEYCLOAK_REALM || 'nexus-portal'}/protocol/openid-connect/logout`,
    userInfoUrl: `${keycloakUrl}/realms/${process.env.KEYCLOAK_REALM || 'nexus-portal'}/protocol/openid-connect/userinfo`,
    issuer: `${frontendKeycloakUrl}/realms/${process.env.KEYCLOAK_REALM || 'nexus-portal'}`,
    redirectUri: keycloakRedirectUri,
  };
});
