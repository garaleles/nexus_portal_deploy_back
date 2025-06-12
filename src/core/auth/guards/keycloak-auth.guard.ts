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

  constructor(
    private readonly configService: ConfigService,
  ) {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const realm = this.configService.get<string>('KEYCLOAK_REALM');

    this.jwksClientInstance = jwksClient({
      jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxAge: 86400000, // 24 saat
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    console.log('🔐 KEYCLOAK_AUTH_GUARD - Request URL:', request.url);
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

    try {
      const decodedToken = await this.verifyToken(token);
      request.user = decodedToken;
      request.keycloakUser = decodedToken;

      console.log('✅ KEYCLOAK_AUTH_GUARD - Kullanıcı doğrulandı:', decodedToken.email || decodedToken.preferred_username);
      this.logger.debug(`Kullanıcı doğrulandı: ${decodedToken.email || decodedToken.preferred_username}`);
      return true;
    } catch (error) {
      console.log('❌ KEYCLOAK_AUTH_GUARD - Token doğrulama hatası:', error.message);
      this.logger.error('Token doğrulama hatası:', error.message);
      throw new UnauthorizedException('Geçersiz token');
    }
  }

  private async verifyToken(token: string): Promise<any> {
    const decodedHeader = jwt.decode(token, { complete: true });

    if (!decodedHeader || !decodedHeader.header.kid) {
      throw new UnauthorizedException('Geçersiz token header');
    }

    const key = await this.getSigningKey(decodedHeader.header.kid);
    const expectedClient = this.configService.get<string>('KEYCLOAK_CLIENT_ID');

    return new Promise((resolve, reject) => {
      jwt.verify(token, key, {
        algorithms: ['RS256'],
        issuer: `${this.configService.get<string>('KEYCLOAK_URL')}/realms/${this.configService.get<string>('KEYCLOAK_REALM')}`,
      }, (err, decoded: any) => {
        if (err) {
          this.logger.error(`Token doğrulama hatası: ${err.message}`);
          reject(err);
        } else {
          const tokenAud = decoded.aud;
          const tokenAzp = decoded.azp;

          const isValidClient = tokenAud === expectedClient || tokenAzp === expectedClient;

          if (!isValidClient) {
            this.logger.error(`Geçersiz client: aud=${tokenAud}, azp=${tokenAzp}, expected=${expectedClient}`);
            reject(new UnauthorizedException('Geçersiz client'));
          } else {
            resolve(decoded);
          }
        }
      });
    });
  }

  private async getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClientInstance.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
        } else {
          const signingKey = key?.getPublicKey();
          resolve(signingKey);
        }
      });
    });
  }
} 