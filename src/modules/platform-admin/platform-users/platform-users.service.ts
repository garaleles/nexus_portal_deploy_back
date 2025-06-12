import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { PlatformUser, PlatformUserRole, PlatformUserStatus } from './entities/platform-user.entity';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdatePlatformUserDto } from './dto/update-platform-user.dto';
import { EmailConfigsService } from '../email-configs/email-configs.service';
import { KeycloakService } from '../../../core/auth/services/keycloak.service';

@Injectable()
export class PlatformUsersService {
  constructor(
    @InjectRepository(PlatformUser)
    private readonly platformUserRepository: Repository<PlatformUser>,
    private readonly emailConfigsService: EmailConfigsService,
    private readonly keycloakService: KeycloakService,
  ) { }

  /**
   * Yeni bir platform kullanıcısı oluşturur
   * @param createPlatformUserDto Kullanıcı bilgileri
   */
  async create(createPlatformUserDto: CreatePlatformUserDto): Promise<PlatformUser> {
    const { email, password, name, lastName, companyName } = createPlatformUserDto;

    // E-posta adresi zaten kullanılıyor mu kontrol et
    const existingUser = await this.platformUserRepository.findOne({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictException(`${email} e-posta adresi zaten kullanılıyor`);
    }

    // Doğrulama token'ı oluştur
    const verificationToken = crypto.randomBytes(32).toString('hex');

    try {
      // Önce Keycloak'ta kullanıcı oluştur
      const keycloakResult = await this.keycloakService.createOrUpdateUser({
        email,
        firstName: name,
        lastName,
        enabled: true,
        emailVerified: false
      }, password, companyName, createPlatformUserDto.role);

      // Yeni kullanıcı oluştur
      const newUser = this.platformUserRepository.create({
        ...createPlatformUserDto,
        verificationToken,
        isVerified: false,
        keycloakId: keycloakResult?.user?.id || null,
      });

      // Kullanıcıyı kaydet
      const savedUser = await this.platformUserRepository.save(newUser);

      // Keycloak üzerinden verification email gönder (Keycloak'ta kullanıcı oluşturulabildiyse)
      if (keycloakResult?.user?.id && keycloakResult.isNewUser) {
        try {
          await this.keycloakService.sendVerificationEmail(keycloakResult.user.id);
        } catch (emailError) {
          console.warn('Keycloak verification email gönderilemedi:', emailError.message);
          // Email hatası kullanıcı oluşturma işlemini durdurmasın
        }
      }

      // Manuel email gönderimi artık kullanılmıyor - Keycloak hallediyor
      // await this.emailConfigsService.sendVerificationEmail(savedUser, verificationToken);

      // Şifre alanını kaldır
      const { password: _, ...result } = savedUser;
      return result as PlatformUser;
    } catch (error) {
      console.error('Kullanıcı oluşturulurken hata:', error);
      throw new InternalServerErrorException('Kullanıcı oluşturulurken bir hata oluştu');
    }
  }

  /**
   * Tüm platform kullanıcılarını getirir
   */
  async findAll(): Promise<PlatformUser[]> {
    return this.platformUserRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Belirli bir platform kullanıcısını ID'ye göre getirir
   * @param id Kullanıcı ID'si
   */
  async findOne(id: string): Promise<PlatformUser> {
    const user = await this.platformUserRepository.findOne({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException(`${id} ID'li kullanıcı bulunamadı`);
    }

    return user;
  }

  /**
   * E-posta adresine göre kullanıcı bulur
   * @param email E-posta adresi
   * @param includePassword Şifre alanını içersin mi?
   */
  async findByEmail(email: string, includePassword = false): Promise<PlatformUser | null> {
    const queryBuilder = this.platformUserRepository.createQueryBuilder('user')
      .where('user.email = :email', { email });

    if (includePassword) {
      queryBuilder.addSelect('user.password');
    }

    return queryBuilder.getOne();
  }

  /**
   * Platform kullanıcısını günceller
   * @param id Kullanıcı ID'si
   * @param updatePlatformUserDto Güncellenecek bilgiler
   */
  async update(id: string, updatePlatformUserDto: UpdatePlatformUserDto): Promise<PlatformUser> {
    const user = await this.findOne(id);

    // E-posta değiştirilmişse, e-posta adresi zaten kullanılıyor mu kontrol et
    if (updatePlatformUserDto.email && updatePlatformUserDto.email !== user.email) {
      const existingUser = await this.platformUserRepository.findOne({
        where: { email: updatePlatformUserDto.email }
      });

      if (existingUser) {
        throw new ConflictException(`${updatePlatformUserDto.email} e-posta adresi zaten kullanılıyor`);
      }
    }

    // Kullanıcıyı güncelle
    Object.assign(user, updatePlatformUserDto);

    try {
      // Veritabanında güncelle
      const updatedUser = await this.platformUserRepository.save(user);

      // Keycloak'ta da güncelle (eğer keycloakId varsa)
      if (user.keycloakId) {
        try {
          // Keycloak güncellemesi için gerekli alanları hazırla
          const keycloakUpdateData: any = {};

          if (updatePlatformUserDto.name !== undefined) {
            keycloakUpdateData.firstName = updatePlatformUserDto.name;
          }

          if (updatePlatformUserDto.lastName !== undefined) {
            keycloakUpdateData.lastName = updatePlatformUserDto.lastName;
          }

          if (updatePlatformUserDto.email !== undefined) {
            keycloakUpdateData.email = updatePlatformUserDto.email;
            keycloakUpdateData.username = updatePlatformUserDto.email; // Username'i de güncelle
          }

          // Attributes'lar için (mevcut attributes'ları koruyup sadece güncellenenleri değiştir)
          const attributesToUpdate: Record<string, string[]> = {};

          if (updatePlatformUserDto.companyName !== undefined) {
            attributesToUpdate.companyName = [updatePlatformUserDto.companyName];
          }

          if (updatePlatformUserDto.role !== undefined) {
            attributesToUpdate.role = [updatePlatformUserDto.role];
          }

          // Eğer attributes güncellemesi varsa ekle
          if (Object.keys(attributesToUpdate).length > 0) {
            keycloakUpdateData.attributes = attributesToUpdate;
          }

          // Keycloak'ta kullanıcıyı güncelle
          if (Object.keys(keycloakUpdateData).length > 0) {
            await this.keycloakService.updateUser(user.keycloakId, keycloakUpdateData);
          }

          // Şifre güncellemesi varsa ayrıca işle
          if (updatePlatformUserDto.password) {
            await this.keycloakService.resetUserPassword(user.keycloakId, updatePlatformUserDto.password);
          }
        } catch (keycloakError) {
          // Keycloak hatası loglansın ama işlem devam etsin
          console.error('Keycloak güncelleme hatası:', keycloakError);
          // Keycloak hatası olan kullanıcıları admin'e bildirebilirsiniz
        }
      }

      return updatedUser;
    } catch (error) {
      throw new InternalServerErrorException('Kullanıcı güncellenirken bir hata oluştu');
    }
  }

  /**
   * Platform kullanıcısını siler
   * @param id Kullanıcı ID'si
   */
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);

    // SuperAdmin silinememeli
    if (user.role === PlatformUserRole.SUPER_ADMIN) {
      throw new BadRequestException('Super Admin kullanıcısı silinemez');
    }

    try {
      // Önce Keycloak'tan sil (eğer keycloakId varsa)
      if (user.keycloakId) {
        try {
          await this.keycloakService.deleteUser(user.keycloakId);
        } catch (keycloakError) {
          // Keycloak hatası loglansın ama silme işlemi devam etsin
          console.error('Keycloak kullanıcı silme hatası:', keycloakError);
          // Keycloak'ta kullanıcı yoksa veya erişim sorunu varsa devam et
        }
      }

      // Veritabanından sil
      await this.platformUserRepository.remove(user);
    } catch (error) {
      // Eğer veritabanı hatası varsa, genel hata fırlat
      if (error instanceof BadRequestException) {
        throw error; // SuperAdmin hatası aynen geçsin
      }
      throw new InternalServerErrorException('Kullanıcı silinirken bir hata oluştu');
    }
  }

  /**
   * Kullanıcı rolünü günceller
   * @param id Kullanıcı ID'si
   * @param role Yeni rol
   */
  async updateRole(id: string, role: PlatformUserRole): Promise<PlatformUser> {
    const user = await this.findOne(id);

    // SuperAdmin rolü değiştirilemez
    if (user.role === PlatformUserRole.SUPER_ADMIN) {
      throw new BadRequestException('Super Admin rolü değiştirilemez');
    }

    user.role = role;
    return this.platformUserRepository.save(user);
  }

  /**
   * Kullanıcı durumunu günceller (aktif/pasif)
   * @param id Kullanıcı ID'si
   * @param isActive Aktif/Pasif durumu
   */
  async updateStatus(id: string, status: PlatformUserStatus): Promise<PlatformUser> {
    const user = await this.findOne(id);

    // SuperAdmin durumu değiştirilemez
    if (user.role === PlatformUserRole.SUPER_ADMIN) {
      throw new BadRequestException('Super Admin durumu değiştirilemez');
    }

    user.status = status;
    return this.platformUserRepository.save(user);
  }

  /**
   * Şifre sıfırlama token'ı oluşturur
   * @param email Kullanıcı e-posta adresi
   */
  async createPasswordResetToken(email: string): Promise<void> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException(`${email} e-posta adresine sahip kullanıcı bulunamadı`);
    }

    // Token oluştur
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Token'i ve geçerlilik süresini kaydet
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 saat geçerli

    await this.platformUserRepository.save(user);

    // Şifre sıfırlama e-postası gönder
    await this.emailConfigsService.sendPasswordResetEmail(user, resetToken);
  }

  /**
   * Şifre sıfırlama işlemini tamamlar
   * @param token Şifre sıfırlama token'ı
   * @param newPassword Yeni şifre
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.platformUserRepository.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + 100) // Token'in geçerli olup olmadığını kontrol et
      }
    });

    if (!user) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş token');
    }

    // Yeni şifreyi ayarla ve token'ları temizle
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await this.platformUserRepository.save(user);
  }

  /**
   * E-posta adresini doğrular
   * @param token Doğrulama token'ı
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await this.platformUserRepository.findOne({
      where: { verificationToken: token }
    });

    if (!user) {
      throw new BadRequestException('Geçersiz doğrulama tokenı');
    }

    if (user.isVerified) {
      throw new BadRequestException('E-posta adresi zaten doğrulanmış');
    }

    // E-posta adresini doğrulanmış olarak işaretle
    user.isVerified = true;
    user.verificationToken = null;
    user.status = PlatformUserStatus.ACTIVE;

    await this.platformUserRepository.save(user);
  }
}