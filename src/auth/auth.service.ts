import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { TwoFactorLoginDto } from './two-factor/dto/two-factor-login.dto';
import { TwoFactorService } from './two-factor/two-factor.service';

type PendingTwoFactorPayload = {
  email: string;
  sub: string;
  type: '2fa-pending';
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly twoFactorService: TwoFactorService,
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
      return this.buildTwoFactorChallenge(user.id, user.email);
    }

    return this.buildAuthResponse(user.id, user.email, user.twoFactorEnabled);
  }

  async verifyTwoFactorLogin(twoFactorLoginDto: TwoFactorLoginDto) {
    const payload = await this.getPendingTwoFactorPayload(
      twoFactorLoginDto.tempToken,
    );
    const valid = await this.twoFactorService.verifyToken(
      payload.sub,
      twoFactorLoginDto.otpCode,
    );

    if (!valid) {
      throw new UnauthorizedException('Invalid two-factor code');
    }

    return {
      valid: true,
    };
  }

  async loginWithTwoFactor(twoFactorLoginDto: TwoFactorLoginDto) {
    const payload = await this.getPendingTwoFactorPayload(
      twoFactorLoginDto.tempToken,
    );
    const valid = await this.twoFactorService.verifyToken(
      payload.sub,
      twoFactorLoginDto.otpCode,
    );

    if (!valid) {
      throw new UnauthorizedException('Invalid two-factor code');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.buildAuthResponse(user.id, user.email, user.twoFactorEnabled);
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

  private async buildTwoFactorChallenge(userId: string, email: string) {
    const tempToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        type: '2fa-pending',
      } satisfies PendingTwoFactorPayload,
      {
        expiresIn: '10m',
      },
    );

    return {
      requiresTwoFactor: true as const,
      tempToken,
    };
  }

  private async getPendingTwoFactorPayload(tempToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<PendingTwoFactorPayload>(
        tempToken,
      );

      if (payload.type !== '2fa-pending') {
        throw new UnauthorizedException('Invalid two-factor token');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired two-factor token');
    }
  }
}
