import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OtpService {
  constructor(private readonly prisma: PrismaService) {}

  async generateOtp(userId: string, email: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        otpCode: code,
        otpExpiresAt: expiresAt,
      },
    });

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM;

    if (!host || !user || !pass || !from) {
      throw new InternalServerErrorException('SMTP is not fully configured');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: 'Your FinTrackr OTP Code',
        text: `Your OTP code is: ${code}. Valid for 10 minutes.`,
      });
    } catch {
      throw new InternalServerErrorException('Could not send OTP email');
    }
  }

  async verifyOtp(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        otpCode: true,
        otpExpiresAt: true,
      },
    });

    const normalizedCode = code.trim();
    const expiresAt = user?.otpExpiresAt?.getTime() ?? 0;

    if (
      !user?.otpCode ||
      user.otpCode !== normalizedCode ||
      !user.otpExpiresAt ||
      expiresAt <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    return true;
  }
}
