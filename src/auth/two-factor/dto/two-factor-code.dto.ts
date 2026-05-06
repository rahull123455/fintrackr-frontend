import { IsString, Matches } from 'class-validator';

export class TwoFactorCodeDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'otpCode must be a 6-digit code' })
  otpCode!: string;
}
