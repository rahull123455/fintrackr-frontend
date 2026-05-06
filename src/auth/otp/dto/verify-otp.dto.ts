import { IsString, Matches, MinLength } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit OTP' })
  code!: string;
}
