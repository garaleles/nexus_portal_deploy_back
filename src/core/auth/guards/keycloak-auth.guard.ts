import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwksClient from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  private readonly logger = new Logger(KeycloakAuthGuard.name);
  private jwksClientInstance: jwksClient.JwksClient;
  private possibleIssuers: string[];

  constructor(
    private readonly configService: ConfigService,
  ) {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const keycloakPublicUrl = this.configService.get<string>('KEYCLOAK_PUBLIC_URL');
    const realm = this.configService.get<string>('KEYCLOAK_REALM');

    console.log('🔐 KEYCLOAK_AUTH_GUARD INIT - URLs:', {
      keycloakUrl,
      keycloakPublicUrl,
      realm
    });

    // Olası issuer URL'leri
    this.possibleIssuers = [
      `${keycloakUrl}/realms/${realm}`,
      `${keycloakPublicUrl}/realms/${realm}`,
      `https://keycloack-production.up.railway.app/realms/${realm}`,
      `https://keycloak-production.up.railway.app/realms/${realm}`
    ].filter(Boolean);

    console.log('🔐 POSSIBLE_ISSUERS:', this.possibleIssuers);

    this.jwksClientInstance = jwksClient({
      jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxAge: 86400000, // 24 saat
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      timeout: 30000, // 30 saniye timeout
      requestHeaders: {
        'User-Agent': 'business-portal-backend'
      }
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    console.log('🔐 KEYCLOAK_AUTH_GUARD - Request URL:', request.url);
    console.log('🔐 KEYCLOAK_AUTH_GUARD - Method:', request.method);
    console.log('🔐 KEYCLOAK_AUTH_GUARD - Auth header var mı?', !!authHeader);

    if (!authHeader) {
      console.log('❌ KEYCLOAK_AUTH_GUARD - Authorization header yok!');
      throw new UnauthorizedException('Authorization header bulunamadı');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.log('❌ KEYCLOAK_AUTH_GUARD - Bearer token yok!');
      throw new UnauthorizedException('Bearer token bulunamadı');
    }

    console.log('🔐 KEYCLOAK_AUTH_GUARD - Token uzunluğu:', token.length);
    console.log('🔐 KEYCLOAK_AUTH_GUARD - Token başlangıcı:', token.substring(0, 50) + '...');

    try {
      // Token'ı decode ederek issuer'ı kontrol et
      const decodedPreview = jwt.decode(token) as any;
      console.log('🔐 KEYCLOAK_AUTH_GUARD - Token preview:', {
        iss: decodedPreview?.iss,
        aud: decodedPreview?.aud,
        azp: decodedPreview?.azp,
        exp: decodedPreview?.exp,
        iat: decodedPreview?.iat,
        sub: decodedPreview?.sub,
        email: decodedPreview?.email
      });

      const decodedToken = await this.verifyToken(token);
      request.user = decodedToken;
      request.keycloakUser = decodedToken;

      console.log('✅ KEYCLOAK_AUTH_GUARD - Kullanıcı doğrulandı:', decodedToken.email || decodedToken.preferred_username);
      this.logger.debug(`Kullanıcı doğrulandı: ${decodedToken.email || decodedToken.preferred_username}`);
      return true;
    } catch (error) {
      console.log('❌ KEYCLOAK_AUTH_GUARD - Token doğrulama hatası:', error.message);
      console.log('❌ KEYCLOAK_AUTH_GUARD - Error stack:', error.stack);
      this.logger.error('Token doğrulama hatası:', error.message);
      throw new UnauthorizedException('Geçersiz token');
    }
  }

  private async verifyToken(token: string): Promise<any> {
    const decodedHeader = jwt.decode(token, { complete: true });

    if (!decodedHeader || !decodedHeader.header.kid) {
      throw new UnauthorizedException('Geçersiz token header');
    }

    console.log('🔐 TOKEN_VERIFY - Header:', decodedHeader.header);

    const key = await this.getSigningKey(decodedHeader.header.kid);
    const expectedClient = this.configService.get<string>('KEYCLOAK_CLIENT_ID');

    console.log('🔐 TOKEN_VERIFY - Expected client:', expectedClient);

    return new Promise((resolve, reject) => {
      // İlk önce issuer kontrolü olmadan verify et
      jwt.verify(token, key, {
        algorithms: ['RS256'],
        // issuer'ı kontrol etmeyelim şimdilik
        ignoreExpiration: false,
        ignoreNotBefore: false,
        audience: false // Audience kontrolünü de manuel yapalım
      }, (err, decoded: any) => {
        if (err) {
          console.log('❌ TOKEN_VERIFY - JWT verify error:', err.message);
          this.logger.error(`Token doğrulama hatası: ${err.message}`);
          reject(err);
        } else {
          console.log('🔐 TOKEN_VERIFY - Decoded payload:', {
            iss: decoded.iss,
            aud: decoded.aud,
            azp: decoded.azp,
            client_id: decoded.client_id,
            exp: new Date(decoded.exp * 1000),
            email: decoded.email
          });

          // Issuer kontrolü
          const isValidIssuer = this.possibleIssuers.includes(decoded.iss);
          if (!isValidIssuer) {
            console.log('❌ TOKEN_VERIFY - Invalid issuer:', decoded.iss);
            console.log('❌ TOKEN_VERIFY - Expected issuers:', this.possibleIssuers);
            reject(new UnauthorizedException(`Geçersiz issuer: ${decoded.iss}`));
            return;
          }

          // Client kontrolü
          const tokenAud = decoded.aud;
          const tokenAzp = decoded.azp;
          const tokenClientId = decoded.client_id;

          const isValidClient = tokenAud === expectedClient ||
            tokenAzp === expectedClient ||
            tokenClientId === expectedClient ||
            (Array.isArray(tokenAud) && tokenAud.includes(expectedClient));

          console.log('🔐 TOKEN_VERIFY - Client validation:', {
            tokenAud,
            tokenAzp,
            tokenClientId,
            expectedClient,
            isValidClient
          });

          if (!isValidClient) {
            this.logger.error(`Geçersiz client: aud=${tokenAud}, azp=${tokenAzp}, client_id=${tokenClientId}, expected=${expectedClient}`);
            reject(new UnauthorizedException('Geçersiz client'));
          } else {
            console.log('✅ TOKEN_VERIFY - Token başarıyla doğrulandı');
            resolve(decoded);
          }
        }
      });
    });
  }

  private async getSigningKey(kid: string): Promise<string> {
    console.log('🔐 SIGNING_KEY - Getting key for kid:', kid);

    return new Promise((resolve, reject) => {
      this.jwksClientInstance.getSigningKey(kid, (err, key) => {
        if (err) {
          console.log('❌ SIGNING_KEY - Error getting key:', err.message);
          reject(err);
        } else {
          const signingKey = key?.getPublicKey();
          console.log('✅ SIGNING_KEY - Key retrieved successfully');
          resolve(signingKey);
        }
      });
    });
  }
} 