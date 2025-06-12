import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { KeycloakService } from './auth/services/keycloak.service';
import { KeycloakAuthGuard } from './auth/guards/keycloak-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CloudinaryService } from './services/cloudinary.service';

@Global()
@Module({
    imports: [
        // JWT Module konfigürasyonu - Keycloak için asymmetric key destekli
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                // Keycloak RS256 için secret yerine publicKey kullanılacak
                // Secret sadece local token'lar için fallback
                secret: configService.get<string>('JWT_SECRET') || 'default-secret-change-in-production',
                verifyOptions: {
                    algorithms: ['RS256', 'HS256'], // Hem RS256 hem HS256 desteği
                },
                signOptions: {
                    expiresIn: '24h',
                    algorithm: 'HS256', // Local signing için HS256
                },
            }),
        }),
        AuthModule,
    ],
    providers: [
        KeycloakService,
        KeycloakAuthGuard,
        RolesGuard,
        CloudinaryService,
    ],
    exports: [
        AuthModule,
        JwtModule,
        KeycloakService,
        KeycloakAuthGuard,
        RolesGuard,
        CloudinaryService,
    ],
})
export class CoreModule { }
