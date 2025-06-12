import { registerAs } from '@nestjs/config';


export default registerAs('keycloak', () => {
  const keycloakUrl = process.env.KEYCLOAK_URL ;
  console.log('Keycloak URL (config): ', keycloakUrl);
  const keycloakRedirectUri = process.env.KEYCLOAK_REDIRECT_URI ;
  console.log('Keycloak Redirect URI (config): ', keycloakRedirectUri);

  return {
    realm: process.env.KEYCLOAK_REALM,
    url: keycloakUrl,
    clientId: process.env.KEYCLOAK_CLIENT_ID ,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    publicClient: false,
    confidentialPort: 0,
    adminUrl: `${keycloakUrl}/admin/realms/${process.env.KEYCLOAK_REALM || 'nexus-portal'}`,
    tokenUrl: `${keycloakUrl}/realms/${process.env.KEYCLOAK_REALM || 'nexus-portal'}/protocol/openid-connect/token`,
    authUrl: `${keycloakUrl}/realms/${process.env.KEYCLOAK_REALM || 'nexus-portal'}/protocol/openid-connect/auth`,
    logoutUrl: `${keycloakUrl}/realms/${process.env.KEYCLOAK_REALM || 'nexus-portal'}/protocol/openid-connect/logout`,
    userInfoUrl: `${keycloakUrl}/realms/${process.env.KEYCLOAK_REALM || 'nexus-portal'}/protocol/openid-connect/userinfo`,
    issuer: `${keycloakUrl}/realms/${process.env.KEYCLOAK_REALM || 'nexus-portal'}`,
    redirectUri: keycloakRedirectUri,
  };
});
