import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { OtpService } from './otp/otp.service';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
  ) {}

  getAuthStatus() {
    return {
      service: 'auth',
      status: 'ready',
    };
  }

  async signup(signupDto: SignupDto) {
    const email = signupDto.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await argon2.hash(signupDto.password),
      },
    });

    return this.buildAuthResponse(user.id, user.email, user.twoFactorEnabled);
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.twoFactorEnabled) {
      await this.otpService.generateOtp(user.id, user.email);

      return {
        requiresOtp: true as const,
        userId: user.id,
      };
    }

    return this.buildAuthResponse(user.id, user.email, user.twoFactorEnabled);
  }

  async sendOtp(userId: string) {
    const user = await this.findUserByIdOrThrow(userId);
    await this.otpService.generateOtp(user.id, user.email);

    return {
      message: 'OTP sent to your email',
    };
  }

  async verifyOtpLogin(userId: string, code: string) {
    const user = await this.findUserByIdOrThrow(userId);
    await this.otpService.verifyOtp(user.id, code);

    return this.buildAuthResponse(user.id, user.email, user.twoFactorEnabled);
  }

  async enableOtp(userId: string, code: string) {
    const user = await this.findUserByIdOrThrow(userId);
    await this.otpService.verifyOtp(user.id, code);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        twoFactorEnabled: updatedUser.twoFactorEnabled,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async buildAuthResponse(
    userId: string,
    email: string,
    twoFactorEnabled: boolean,
  ) {
    const accessToken = await this.jwtService.signAsync({
      sub: userId,
      email,
    });

    return {
      accessToken,
      user: {
        id: userId,
        email,
        twoFactorEnabled,
      },
    };
  }

  private async findUserByIdOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
