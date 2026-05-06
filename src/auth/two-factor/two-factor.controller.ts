import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../authenticated-request.type';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { TwoFactorLoginDto } from './dto/two-factor-login.dto';
import { TwoFactorService } from './two-factor.service';

@Controller('auth/2fa')
export class TwoFactorController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  generate(@Req() req: AuthenticatedRequest) {
    return this.twoFactorService.generateSecret(req.user.id, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('enable')
  async enable(
    @Req() req: AuthenticatedRequest,
    @Body() twoFactorCodeDto: TwoFactorCodeDto,
  ) {
    const valid = await this.twoFactorService.verifyToken(
      req.user.id,
      twoFactorCodeDto.otpCode,
    );

    if (!valid) {
      throw new UnauthorizedException('Invalid two-factor code');
    }

    await this.twoFactorService.enable2FA(req.user.id);

    return {
      success: true,
    };
  }

  @Post('verify')
  verify(@Body() twoFactorLoginDto: TwoFactorLoginDto) {
    return this.authService.verifyTwoFactorLogin(twoFactorLoginDto);
  }

  @Post('login')
  login(@Body() twoFactorLoginDto: TwoFactorLoginDto) {
    return this.authService.loginWithTwoFactor(twoFactorLoginDto);
  }
}
