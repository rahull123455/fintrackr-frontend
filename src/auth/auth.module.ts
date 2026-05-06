import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TwoFactorController } from './two-factor/two-factor.controller';
import { TwoFactorService } from './two-factor/two-factor.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController, TwoFactorController],
  providers: [AuthService, JwtStrategy, TwoFactorService],
})
export class AuthModule {}
