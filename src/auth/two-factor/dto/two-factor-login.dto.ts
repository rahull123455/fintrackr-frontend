import { IsString, Matches, MinLength } from 'class-validator';

export class TwoFactorLoginDto {
  @IsString()
  @MinLength(1)
  tempToken!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'otpCode must be a 6-digit code' })
  otpCode!: string;
}
