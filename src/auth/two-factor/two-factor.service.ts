import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';

@Injectable()
export class TwoFactorService {
  private readonly encryptionKey = createHash('sha256')
    .update(
      process.env.TWO_FACTOR_ENCRYPTION_KEY ??
        process.env.JWT_SECRET ??
        'dev-2fa-secret',
    )
    .digest();

  constructor(private readonly prisma: PrismaService) {}

  async generateSecret(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      issuer: 'FinTrackr',
      length: 20,
      name: email,
    });

    if (!secret.otpauth_url || !secret.base32) {
      throw new InternalServerErrorException(
        'Could not generate two-factor secret',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: this.encrypt(secret.base32),
        twoFactorEnabled: false,
      },
    });

    return {
      otpauthUrl: secret.otpauth_url,
      qrCodeDataUrl: await QRCode.toDataURL(secret.otpauth_url),
      secret: secret.base32,
    };
  }

  async verifyToken(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });

    if (!user?.twoFactorSecret) {
      throw new UnauthorizedException('Two-factor authentication is not configured');
    }

    const normalizedToken = token.trim();
    if (!/^\d{6}$/.test(normalizedToken)) {
      return false;
    }

    const secret = this.decrypt(user.twoFactorSecret);
    return speakeasy.totp.verify({
      encoding: 'base32',
      secret,
      token: normalizedToken,
      window: 1,
    });
  }

  async enable2FA(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return {
      success: true,
    };
  }

  private encrypt(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  private decrypt(payload: string) {
    const [ivPart, authTagPart, encryptedPart] = payload.split(':');

    if (!ivPart || !authTagPart || !encryptedPart) {
      throw new InternalServerErrorException(
        'Stored two-factor secret is invalid',
      );
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(ivPart, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(authTagPart, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
