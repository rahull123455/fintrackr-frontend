import { IsString, MinLength } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @MinLength(1)
  userId!: string;
}
