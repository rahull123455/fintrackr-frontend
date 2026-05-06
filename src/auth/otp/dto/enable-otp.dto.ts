import { IsString, Matches } from 'class-validator';

export class EnableOtpDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit OTP' })
  code!: string;
}
