import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../authenticated-request.type';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { EnableOtpDto } from './dto/enable-otp.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('auth/otp')
export class OtpController {
  constructor(private readonly authService: AuthService) {}

  @Post('send')
  send(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto.userId);
  }

  @Post('verify')
  verify(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtpLogin(
      verifyOtpDto.userId,
      verifyOtpDto.code,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('enable')
  enable(
    @Req() req: AuthenticatedRequest,
    @Body() enableOtpDto: EnableOtpDto,
  ) {
    return this.authService.enableOtp(req.user.id, enableOtpDto.code);
  }
}
